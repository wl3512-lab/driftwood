// Saved progress: player name, best stars per level, field-guide cards,
// whether the opening cutscene has been seen (so it plays once, before Level 1),
// and which levels' seed handoffs Rowan has given (once each, on first play).
// Storage is passed in (localStorage in the browser, a fake in tests) and every
// access is guarded: private windows and blocked storage must not break the game.

import { caughtOn } from "./engine/stew.js";
import { training } from "./engine/level-runner.js";
import { cropsOf, mergeCrops } from "./engine/crops.js";

const KEY = "dw2_progress";

export function emptyProgress() {
  return { name: "", levels: {}, guide: [], introSeen: false, handoffSeen: [] };
}

export function loadProgress(storage) {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return emptyProgress();
    const saved = JSON.parse(raw);
    const ok = saved && typeof saved === "object" && !Array.isArray(saved);
    if (!ok) return emptyProgress();
    return {
      name: typeof saved.name === "string" ? saved.name : "",
      levels: saved.levels && typeof saved.levels === "object" && !Array.isArray(saved.levels) ? saved.levels : {},
      guide: Array.isArray(saved.guide) ? saved.guide.filter(isCard) : [],
      introSeen: saved.introSeen === true,
      handoffSeen: Array.isArray(saved.handoffSeen) ? saved.handoffSeen.filter((id) => typeof id === "string") : [],
    };
  } catch {
    return emptyProgress();
  }
}

const isCard = (c) => Boolean(c) && typeof c === "object" && !Array.isArray(c) && typeof c.levelId === "string";

export function saveProgress(storage, progress) {
  try {
    storage?.setItem(KEY, JSON.stringify(progress));
  } catch {
    // Storage full or blocked: the game keeps working, it just won't remember.
  }
}

// The opening cutscene has played (to the end or skipped): don't force it again.
// New game: a blank save, and the small per-player flags (the map's sun, the
// almanac nudges) cleared too. The AI on/off switch (dw2_ai) is a setting, so it stays.
export function startOver(storage) {
  const fresh = emptyProgress();
  try {
    const drop = [];
    for (let i = 0; i < (storage?.length || 0); i++) {
      const k = storage.key(i);
      if (k === "dw2_map_time" || k?.startsWith("dw2_almanac_hint_")) drop.push(k);
    }
    drop.forEach((k) => storage.removeItem(k));
  } catch { /* storage blocked: the blank save below still holds in memory */ }
  saveProgress(storage, fresh);
  return fresh;
}

export function markIntroSeen(progress) {
  return progress.introSeen ? progress : { ...progress, introSeen: true };
}

// Rowan's seed handoff plays on a level's first play only: not once seen, and
// not on a replay of a level already finished (saved before the handoff existed).
export function needsHandoff(progress, levelId) {
  return !(progress?.handoffSeen || []).includes(levelId) && !progress?.levels?.[levelId];
}

export function markHandoffSeen(progress, levelId) {
  const seen = progress.handoffSeen || [];
  return seen.includes(levelId) ? progress : { ...progress, handoffSeen: [...seen, levelId] };
}

// A brand-new player sees the cutscene before Level 1; anyone who has seen it,
// or has already played a level (saved before the cutscene existed), doesn't.
export function needsIntro(progress) {
  return !progress?.introSeen && Object.keys(progress?.levels || {}).length === 0;
}

// Keeps the best star count; the field-guide card records the first play,
// so "it fooled you" stays true even after a better replay. The separate
// caught flag remembers a healthy garden, including a catch worth only 1 star.
// crops: how each crop ended (engine/crops.js), best play kept per crop, for
// Rowan's dinner and the levels that carry earlier crops over.
export function recordLevel(progress, level, state) {
  const prev = progress.levels[level.id];
  const crops = state?.beds ? mergeCrops(prev?.crops, cropsOf(level, state)) : prev?.crops;
  const levels = {
    ...progress.levels,
    [level.id]: {
      stars: Math.max(prev?.stars || 0, state.stars),
      fooled: prev ? prev.fooled : state.fooled,
      caught: caughtOn(prev) || (state.lastFooled ?? state.fooled) === false,
      practice: Math.max(practiceFor(progress, level.id), typeof state.trainPts === "number" ? training(state) : (state.stars || 0) / 3),
      ...(crops ? { crops } : {}),
    },
  };
  const hasCard = progress.guide.some((c) => c.levelId === level.id);
  const guide = hasCard
    ? progress.guide
    : [...progress.guide, { levelId: level.id, flaw: level.reveal.flaw, tip: level.reveal.tip, fooled: state.fooled }];
  return { ...progress, levels, guide };
}

// How trained a level's helper is, 0…1 (the best play, like stars). Saves
// from before the bar existed derive it from their stars.
export function trainedFor(progress, levelId) {
  return practiceFor(progress, levelId);
}

// Level N opens once level N-1 has been finished. orderedIds lists level ids by number.
export function isUnlocked(progress, levelNumber, orderedIds) {
  if (levelNumber === 1) return true;
  return Boolean(progress.levels[orderedIds[levelNumber - 2]]);
}

// True once every level in ids has a record (the ending unlocks).
export function allDone(progress, ids) {
  return ids.length > 0 && ids.every((id) => Boolean(progress?.levels?.[id]));
}

// Old helper-training scores do not demonstrate evidence-checking practice.
// The practice bar, 0…1 (the best play). Saves from before it existed fall
// back to their old "trained" score, then to their stars, so the map, the
// dinner and a replay's merge all agree for a returning player.
export function practiceFor(progress, levelId) {
  const rec = progress?.levels?.[levelId];
  if (!rec) return 0;
  const ok = (v) => typeof v === "number" && Number.isFinite(v);
  const v = ok(rec.practice) ? rec.practice : ok(rec.trained) ? rec.trained : (rec.stars || 0) / 3;
  return Math.max(0, Math.min(1, v));
}
