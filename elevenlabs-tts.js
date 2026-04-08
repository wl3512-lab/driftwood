// ═══════════════════════════════════════════════════════════
// DRIFTWOOD — ElevenLabs Voice System
// Pre-recorded clips + real-time TTS for chat responses
// ═══════════════════════════════════════════════════════════

const DriftwoodVoice = (() => {
  // ─── CONFIG ───
  // Set your API key here for real-time chat TTS
  // For pre-recorded clips, no key needed (they're just mp3 files)
  let API_KEY = ""; // Set via DriftwoodVoice.setApiKey("sk-...")
  const API_URL = "https://api.elevenlabs.io/v1/text-to-speech";
  const MODEL_ID = "eleven_turbo_v2_5"; // Fast model for real-time chat

  // Voice IDs — populated from audio/voice-ids.json or set manually
  // These are filled in after running generate-voices.py
  let voiceIds = {
    ember: "",
    mango: "",
    bugs: "",
    biscuit: "",
    luna: "",
  };

  // Voice settings per pet (matches the generation script)
  const VOICE_SETTINGS = {
    ember:   { stability: 0.35, similarity_boost: 0.70, style: 0.60 },
    mango:   { stability: 0.25, similarity_boost: 0.75, style: 0.80 },
    bugs:    { stability: 0.40, similarity_boost: 0.80, style: 0.65 },
    biscuit: { stability: 0.30, similarity_boost: 0.75, style: 0.75 },
    luna:    { stability: 0.55, similarity_boost: 0.85, style: 0.50 },
  };

  // ─── PRE-RECORDED AUDIO CACHE ───
  const audioCache = {}; // "ember/idle-1" -> Audio element
  let audioEnabled = true;
  let currentAudio = null; // Currently playing audio
  let voiceIdsLoaded = false;

  // ─── INIT ───
  async function init() {
    // Try to load voice IDs from the generated mapping
    try {
      const res = await fetch("audio/voice-ids.json");
      if (res.ok) {
        const ids = await res.json();
        Object.assign(voiceIds, ids);
        voiceIdsLoaded = true;
        console.log("[Voice] Voice IDs loaded:", voiceIds);
      }
    } catch (e) {
      console.log("[Voice] No voice-ids.json found — real-time TTS will need manual voice IDs");
    }

    // Preload common audio clips
    const pets = ["ember", "mango", "bugs", "biscuit", "luna"];
    const states = ["idle", "eating", "hungry", "caught"];

    for (const pet of pets) {
      for (const state of states) {
        for (let i = 1; i <= 3; i++) {
          const key = `${pet}/${state}-${i}`;
          const path = `audio/${key}.mp3`;
          preloadAudio(key, path);
        }
      }
    }
  }

  function preloadAudio(key, path) {
    const audio = new Audio();
    audio.preload = "auto";
    audio.src = path;
    audio.volume = 0.7;

    // Don't error if file doesn't exist yet
    audio.onerror = () => {
      // File not generated yet — that's fine
    };

    audioCache[key] = audio;
  }

  // ─── PLAY PRE-RECORDED CLIP ───
  function playClip(petId, state) {
    if (!audioEnabled) return;

    // Pick random clip (1-3)
    const n = Math.floor(Math.random() * 3) + 1;
    const key = `${petId}/${state}-${n}`;
    const audio = audioCache[key];

    if (!audio || audio.error) {
      console.log(`[Voice] Clip not available: ${key}`);
      return false;
    }

    // Stop any currently playing audio
    stopCurrent();

    // Play
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Autoplay blocked — needs user interaction first
    });
    currentAudio = audio;
    return true;
  }

  // ─── REAL-TIME TTS FOR CHAT ───
  async function speakChat(petId, text) {
    if (!audioEnabled || !API_KEY) return false;

    const voiceId = voiceIds[petId];
    if (!voiceId) {
      console.log(`[Voice] No voice ID for ${petId} — skipping TTS`);
      return false;
    }

    const settings = VOICE_SETTINGS[petId] || VOICE_SETTINGS.ember;

    // Stop any currently playing audio
    stopCurrent();

    try {
      const res = await fetch(`${API_URL}/${voiceId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": API_KEY,
        },
        body: JSON.stringify({
          text: cleanTextForTTS(text),
          model_id: MODEL_ID,
          voice_settings: {
            stability: settings.stability,
            similarity_boost: settings.similarity_boost,
            style: settings.style,
            use_speaker_boost: true,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error(`[Voice] TTS error (${res.status}):`, err);
        return false;
      }

      // Stream audio
      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.volume = 0.75;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        currentAudio = null;
      };

      currentAudio = audio;
      await audio.play();
      return true;

    } catch (e) {
      console.error("[Voice] TTS failed:", e);
      return false;
    }
  }

  // ─── STREAMING TTS (lower latency) ───
  async function speakChatStreaming(petId, text) {
    if (!audioEnabled || !API_KEY) return false;

    const voiceId = voiceIds[petId];
    if (!voiceId) return false;

    const settings = VOICE_SETTINGS[petId] || VOICE_SETTINGS.ember;

    stopCurrent();

    try {
      const res = await fetch(`${API_URL}/${voiceId}/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": API_KEY,
        },
        body: JSON.stringify({
          text: cleanTextForTTS(text),
          model_id: MODEL_ID,
          voice_settings: {
            stability: settings.stability,
            similarity_boost: settings.similarity_boost,
            style: settings.style,
            use_speaker_boost: true,
          },
        }),
      });

      if (!res.ok) return false;

      // Use MediaSource for streaming playback
      const mediaSource = new MediaSource();
      const audio = new Audio();
      audio.src = URL.createObjectURL(mediaSource);
      audio.volume = 0.75;
      currentAudio = audio;

      mediaSource.addEventListener("sourceopen", async () => {
        const sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");
        const reader = res.body.getReader();

        audio.play().catch(() => {});

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            if (mediaSource.readyState === "open") {
              mediaSource.endOfStream();
            }
            break;
          }
          // Wait for buffer to be ready
          if (sourceBuffer.updating) {
            await new Promise(r => sourceBuffer.addEventListener("updateend", r, { once: true }));
          }
          sourceBuffer.appendBuffer(value);
        }
      });

      return true;
    } catch (e) {
      console.error("[Voice] Streaming TTS failed:", e);
      return false;
    }
  }

  // ─── UTILITIES ───

  function cleanTextForTTS(text) {
    // Remove action descriptions like *stretches* *ears flick*
    let clean = text.replace(/\*[^*]+\*/g, " ");
    // Remove emoji
    clean = clean.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "");
    // Clean up whitespace
    clean = clean.replace(/\s+/g, " ").trim();
    return clean;
  }

  function stopCurrent() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
  }

  function setApiKey(key) {
    API_KEY = key;
    console.log("[Voice] API key set");
  }

  function setVoiceId(petId, voiceId) {
    voiceIds[petId] = voiceId;
  }

  function setEnabled(enabled) {
    audioEnabled = enabled;
    if (!enabled) stopCurrent();
  }

  function isEnabled() {
    return audioEnabled;
  }

  function hasApiKey() {
    return !!API_KEY;
  }

  return {
    init,
    playClip,
    speakChat,
    speakChatStreaming,
    stopCurrent,
    setApiKey,
    setVoiceId,
    setEnabled,
    isEnabled,
    hasApiKey,
  };
})();
