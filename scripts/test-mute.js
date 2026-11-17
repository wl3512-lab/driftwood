// Init script for browser test runs: keeps the game silent on the tester's
// machine. Usage: agent-browser open <url> --init-script scripts/test-mute.js
// Sets the game's own mute preference, and belts-and-braces stubs every
// audio path so the CRT cover and pet voices stay quiet too.
(function () {
  try { localStorage.setItem("dw_audio_muted", "1"); } catch (_) {}
  // Driftwood v2's synth (v2/audio/index.js) never creates an AudioContext on
  // a test page, even if a run clicks the sound switch on: cues are only
  // logged to window.__dwAudioLog. OfflineAudioContext is left alone, so the
  // trailer stem render (scripts/render-trailer-audio.cjs) still works; it
  // renders to memory and plays nothing.
  try { window.__dwAudioSilent = true; } catch (_) {}
  // Driftwood v2: pets speak their written lines, word for word (no AI
  // rewording, no thinking pause), so test runs are deterministic. A run that
  // wants the live AI sets window.__dwAI = true in a later init script.
  try { window.__dwAI = false; } catch (_) {}
  // Driftwood v2 hands-on actions (v2/actions/runner.js): finish each one the
  // moment it opens (through the same path as the keyboard), so flows written
  // before the actions still pass while performing them. A run that drags by
  // hand sets window.__dwAutoAct = false in a later init script.
  try { if (window.__dwAutoAct === undefined) window.__dwAutoAct = true; } catch (_) {}
  // Driftwood v2: Rowan's seed handoff at the start of a level's first play
  // (v2/ui/handoff.js) is off, so flows written before it still pass. A run
  // that checks it sets window.__dwHandoff = true in a later init script.
  try { if (window.__dwHandoff === undefined) window.__dwHandoff = false; } catch (_) {}
  // Driftwood v2: the "turn your phone sideways" screen (v2/ui/rotate.js) is
  // off, so upright-phone runs reach the game. A run that checks it sets
  // window.__dwRotate = true in a later init script.
  try { if (window.__dwRotate === undefined) window.__dwRotate = false; } catch (_) {}
  // Driftwood v2: each play picks a random version of every slip
  // (v2/engine/variants.js). Test runs play the written one; a run that checks
  // another sets window.__dwVersion = k in a later init script.
  try { if (window.__dwVersion === undefined) window.__dwVersion = 0; } catch (_) {}
  // Never test against the service worker's cached bundle: a reload after an
  // edit would otherwise run the previous sketch.js (cache-first) and the
  // results would describe code that no longer exists.
  try {
    if (navigator.serviceWorker) {
      navigator.serviceWorker.getRegistrations().then(function (rs) { rs.forEach(function (r) { r.unregister(); }); });
      // and stop the page re-registering it for the next load
      navigator.serviceWorker.register = function () { return Promise.reject(new Error("service worker disabled for test runs")); };
    }
    if (window.caches) caches.keys().then(function (ks) { ks.forEach(function (k) { caches.delete(k); }); });
  } catch (_) {}
  try { if (window.speechSynthesis) window.speechSynthesis.speak = function () {}; } catch (_) {}
  try {
    var mute = function (Ctor) {
      if (!Ctor) return Ctor;
      return function () {
        var ctx = new (Function.prototype.bind.apply(Ctor, [null].concat([].slice.call(arguments))))();
        try { ctx.destination.channelCount = 1; ctx.suspend(); ctx.resume = function () { return Promise.resolve(); }; } catch (_) {}
        return ctx;
      };
    };
    window.AudioContext = mute(window.AudioContext);
    window.webkitAudioContext = mute(window.webkitAudioContext);
  } catch (_) {}
  try {
    var play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () { this.muted = true; this.volume = 0; return play.apply(this, arguments); };
  } catch (_) {}
})();
