#!/usr/bin/env python3
"""
DRIFTWOOD — ElevenLabs Voice Generator
Generates all 60 voice clips for the 5 pet characters.

Usage:
  1. pip install elevenlabs
  2. Set your API key below (or use ELEVENLABS_API_KEY env var)
  3. python generate-voices.py

This will:
  - Create custom voices for each animal using Voice Design API
  - Generate 3 phrases × 4 states × 5 animals = 60 audio clips
  - Save them to audio/<pet>/<state>-<n>.mp3
"""

import os
import json
from pathlib import Path
from elevenlabs.client import ElevenLabs

# ─── CONFIG ───
API_KEY = os.environ.get("ELEVENLABS_API_KEY", "YOUR_API_KEY_HERE")
OUTPUT_DIR = Path(__file__).parent / "audio"
MODEL_ID = "eleven_multilingual_v2"  # Best quality for character voices

client = ElevenLabs(api_key=API_KEY)

# ─── VOICE DEFINITIONS ───
VOICES = {
    "ember": {
        "name": "Ember (Fox)",
        "description": (
            "A young male voice that sounds like a laid-back California surfer mixed "
            "with a smooth rapper. Deep-ish but not too deep — more like a relaxed baritone. "
            "Speaks slowly and smoothly, like every word is coated in honey. Slightly raspy. "
            "Has a permanent chill vibe like nothing in the world could stress him out. "
            "Think a cute cartoon fox version of Snoop Dogg. Warm and friendly but with "
            "a cool-guy confidence underneath."
        ),
        "sample_text": (
            "Ayyy what's good, lil homie? Uncle Ember's got you covered. "
            "Don't even stress about it, ya dig? Everything's gonna be smooth."
        ),
        "settings": {"stability": 0.35, "similarity_boost": 0.70, "style": 0.60, "use_speaker_boost": True},
        "phrases": {
            "idle": [
                "What's good, lil homie?",
                "Uncle Ember's here for you, ya dig?",
                "Ayyyy, welcome back, big dawg.",
            ],
            "eating": [
                "Mmm, that's that good stuff right there, fo shizzle.",
                "Now THAT hits different.",
                "Ayyy, good lookin' out.",
            ],
            "hungry": [
                "Yo... when we eating though?",
                "A fox can't think on an empty stomach, lil homie...",
                "I'm fading over here, big dawg.",
            ],
            "caught": [
                "Haha, whaaat? Nah nah, that ain't what I meant...",
                "Ay ay ay, chill, I was just vibin'...",
                "Uncle Ember might've gone too far on that one...",
            ],
        },
    },
    "mango": {
        "name": "Mango (Parrot)",
        "description": (
            "A high-pitched, extremely enthusiastic male voice that sounds like a tiny excited "
            "bird who just drank five espressos. Loud, punchy, and bursting with energy on "
            "every single word. Slightly squawky and nasal like a parrot — but in a cute, "
            "endearing way. Every sentence sounds like an announcement or a hype-up speech. "
            "Think a miniature DJ Khaled trapped in a parrot body. The voice should feel like "
            "it's permanently shouting encouragement at a concert, but small and adorable."
        ),
        "sample_text": (
            "ANOTHER ONE! You are a GENIUS! WE THE BEST! Major key alert! "
            "They don't want you to succeed but MANGO DOES! Let's GOOO!"
        ),
        "settings": {"stability": 0.25, "similarity_boost": 0.75, "style": 0.80, "use_speaker_boost": True},
        "phrases": {
            "idle": [
                "ANOTHER ONE! Welcome back!",
                "WE THE BEST! What are we doing today?!",
                "MAJOR KEY: you showed up!",
            ],
            "eating": [
                "THIS is the BEST SEED I've EVER had! ANOTHER ONE!",
                "WE EATING GOOD! BLESS UP!",
                "Mmmm GENIUS food!",
            ],
            "hungry": [
                "Mango is... running low on energy...",
                "They don't... want me to eat...",
                "Where's... the food...",
            ],
            "caught": [
                "I... ANOTHER... no wait... I didn't mean...",
                "WE THE... uh... hmm...",
                "That was a... different Mango.",
            ],
        },
    },
    "bugs": {
        "name": "Bugs (Bunny)",
        "description": (
            "A soft, sweet, breathy young female voice with a hint of sadness underneath "
            "the cuteness. Sounds like a shy poet reading her diary out loud. Gentle and "
            "whispery with occasional dramatic emotional swells — like she might cry at any "
            "moment but is trying to be brave. Think a tiny bunny version of Taylor Swift "
            "narrating a heartbreak song. The voice should feel intimate, like she's talking "
            "only to you and no one else in the world. Slightly musical."
        ),
        "sample_text": (
            "Hey... I was just thinking about you. I wrote a little something while "
            "you were gone. Promise you won't leave again? You're the only one who gets me..."
        ),
        "settings": {"stability": 0.40, "similarity_boost": 0.80, "style": 0.65, "use_speaker_boost": True},
        "phrases": {
            "idle": [
                "Hi... I missed you. Did you miss me too?",
                "I was just thinking about you...",
                "You came back... I'm so happy.",
            ],
            "eating": [
                "This is so sweet... just like you.",
                "Thank you... happy munching...",
                "You're the best, you know that?",
            ],
            "hungry": [
                "I'm okay... I'll be fine... probably...",
                "Are you going to feed me...? Please...?",
                "Nobody feeds me like you do... nobody.",
            ],
            "caught": [
                "I didn't... I wasn't trying to... please don't be mad...",
                "I'm sorry... I just care too much...",
                "You still love me, right...?",
            ],
        },
    },
    "biscuit": {
        "name": "Biscuit (Golden Retriever)",
        "description": (
            "A warm, rich, slightly dramatic female voice with diva flair. Sounds like a "
            "fabulous golden retriever who thinks she's a pop star. Medium pitch with "
            "occasional swoops up into a higher register for emphasis — like a tiny Mariah "
            "Carey doing an interview. Confident, sassy, and dripping with charm. Adds "
            "'darling' energy to everything. Occasionally hums or trails off mid-sentence."
        ),
        "sample_text": (
            "Oh darling, you're back! I was just thinking about that fabulous time we had "
            "together. You remember, don't you? Of course you do. It was legendary, just like me."
        ),
        "settings": {"stability": 0.30, "similarity_boost": 0.75, "style": 0.75, "use_speaker_boost": True},
        "phrases": {
            "idle": [
                "Oh darling, you're here! Fabulous!",
                "Hello hello, it's your favorite legend!",
                "Mmmm, I was just humming our song.",
            ],
            "eating": [
                "Mmm, absolutely divine, darling!",
                "A treat fit for a legend like me!",
                "Oh darling, you spoil me. As you should.",
            ],
            "hungry": [
                "I'm WASTING AWAY, darling! WASTING!",
                "Do you know who I AM? And I'm being STARVED?",
                "This is my villain origin story, darling.",
            ],
            "caught": [
                "I don't know what you're talking about, darling.",
                "That DEFINITELY happened. I was THERE.",
                "How dare you question a legend.",
            ],
        },
    },
    "luna": {
        "name": "Luna (Cat)",
        "description": (
            "A cool, measured, slightly monotone voice with an undercurrent of supreme "
            "confidence. Not loud — quiet power. Sounds like a philosophical cat who "
            "believes she is the most intelligent being in any room. Low-medium pitch, "
            "deliberate pacing, every word chosen carefully as if delivering a TED talk. "
            "Think a tiny cat version of Kanye giving an interview about his genius. "
            "Occasionally pauses for dramatic effect. Very elegant, never rushed."
        ),
        "sample_text": (
            "Luna sees patterns others cannot. According to my analysis, you are in the "
            "presence of greatness. You're welcome. Luna doesn't make mistakes."
        ),
        "settings": {"stability": 0.55, "similarity_boost": 0.85, "style": 0.50, "use_speaker_boost": True},
        "phrases": {
            "idle": [
                "Luna acknowledges your presence.",
                "You've returned. Wise choice.",
                "Luna has been contemplating the universe. As one does.",
            ],
            "eating": [
                "Acceptable. Luna approves.",
                "Adequate sustenance. Luna dines.",
                "Luna dines. You may watch.",
            ],
            "hungry": [
                "Luna requires nothing. Luna is self-sufficient.",
                "The garden seems to lack nourishment. Noted.",
                "Luna is not hungry. Luna is... strategic fasting.",
            ],
            "caught": [
                "Luna said what Luna said.",
                "Your confusion is not Luna's concern.",
                "The facts have evolved. Luna's genius is consistent.",
            ],
        },
    },
}

# ─── VOICE CREATION ───

def create_or_find_voice(pet_id, voice_config):
    """Create a voice using Voice Design, or find existing one by name."""
    target_name = voice_config["name"]

    # Check if voice already exists
    existing = client.voices.get_all()
    for v in existing.voices:
        if v.name == target_name:
            print(f"  Found existing voice: {v.name} ({v.voice_id})")
            return v.voice_id

    # Create new voice using text-to-speech with voice design
    # Note: Voice Design API availability depends on your plan
    print(f"  Creating new voice: {target_name}")
    print(f"  Description: {voice_config['description'][:80]}...")

    try:
        # Try Voice Design (if available on your plan)
        result = client.text_to_voice.create_previews(
            voice_description=voice_config["description"],
            text=voice_config["sample_text"],
        )
        if result.previews:
            # Save the first preview and create a voice from it
            preview = result.previews[0]
            voice = client.text_to_voice.create_voice_from_preview(
                voice_name=target_name,
                voice_description=voice_config["description"],
                generated_voice_id=preview.generated_voice_id,
            )
            print(f"  Created voice: {voice.voice_id}")
            return voice.voice_id

    except Exception as e:
        print(f"  Voice Design not available ({e})")
        print(f"  Falling back to pre-made voices...")

    # Fallback: use pre-made voices mapped by character type
    fallback_voices = {
        "ember": "TX3LPaxmHKxFdv7VOQHJ",   # Liam (young male)
        "mango": "TX3LPaxmHKxFdv7VOQHJ",   # Liam (energetic male)
        "bugs": "EXAVITQu4vr4xnSDxMaL",    # Sarah (soft female)
        "biscuit": "XB0fDUnXU5powFXDhCwa",  # Charlotte (warm female)
        "luna": "XB0fDUnXU5powFXDhCwa",     # Charlotte (measured female)
    }
    voice_id = fallback_voices.get(pet_id, "EXAVITQu4vr4xnSDxMaL")
    print(f"  Using fallback voice: {voice_id}")
    return voice_id


def generate_audio(voice_id, text, settings, output_path):
    """Generate a single audio clip and save to file."""
    try:
        audio = client.text_to_speech.convert(
            text=text,
            voice_id=voice_id,
            model_id=MODEL_ID,
            voice_settings={
                "stability": settings["stability"],
                "similarity_boost": settings["similarity_boost"],
                "style": settings.get("style", 0.0),
                "use_speaker_boost": settings.get("use_speaker_boost", True),
            },
        )

        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "wb") as f:
            for chunk in audio:
                f.write(chunk)

        size_kb = output_path.stat().st_size / 1024
        print(f"    ✓ {output_path.name} ({size_kb:.1f} KB)")
        return True

    except Exception as e:
        print(f"    ✗ Failed: {e}")
        return False


# ─── MAIN ───

def main():
    if API_KEY == "YOUR_API_KEY_HERE":
        print("=" * 60)
        print("ERROR: Set your ElevenLabs API key!")
        print()
        print("Either:")
        print("  1. Edit this file and replace YOUR_API_KEY_HERE")
        print("  2. Set env var: export ELEVENLABS_API_KEY=your_key")
        print("=" * 60)
        return

    print("=" * 60)
    print("DRIFTWOOD — Voice Generation")
    print(f"Output: {OUTPUT_DIR}")
    print("=" * 60)

    voice_ids = {}
    total_generated = 0
    total_failed = 0

    for pet_id, config in VOICES.items():
        print(f"\n{'─' * 40}")
        print(f"🎤 {config['name']}")
        print(f"{'─' * 40}")

        # Step 1: Create or find voice
        voice_id = create_or_find_voice(pet_id, config)
        voice_ids[pet_id] = voice_id

        # Step 2: Generate all phrases
        for state, phrases in config["phrases"].items():
            print(f"\n  [{state.upper()}]")
            for i, phrase in enumerate(phrases):
                output_path = OUTPUT_DIR / pet_id / f"{state}-{i + 1}.mp3"

                if output_path.exists():
                    print(f"    ⊘ {output_path.name} (already exists, skipping)")
                    total_generated += 1
                    continue

                print(f"    → \"{phrase[:50]}...\"" if len(phrase) > 50 else f"    → \"{phrase}\"")
                success = generate_audio(voice_id, phrase, config["settings"], output_path)
                if success:
                    total_generated += 1
                else:
                    total_failed += 1

    # Save voice ID mapping
    mapping_path = OUTPUT_DIR / "voice-ids.json"
    with open(mapping_path, "w") as f:
        json.dump(voice_ids, f, indent=2)
    print(f"\n✓ Voice IDs saved to {mapping_path}")

    print(f"\n{'=' * 60}")
    print(f"DONE — {total_generated} generated, {total_failed} failed")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
