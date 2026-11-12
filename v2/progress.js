// Saved progress: player name, best stars per level, field-guide cards.
// Storage is passed in (localStorage in the browser, a fake in tests) and every
// access is guarded: private windows and blocked storage must not break the game.

const KEY = "dw2_progress";

export function emptyProgress() {
  return { name: "", levels: {}, guide: [] };
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

// Keeps the best star count; the field-guide card records the first play,
// so "it fooled you" stays true even after a better replay.
export function recordLevel(progress, level, state) {
  const prev = progress.levels[level.id];
  const levels = {
    ...progress.levels,
    [level.id]: { stars: Math.max(prev?.stars || 0, state.stars), fooled: prev ? prev.fooled : state.fooled },
  };
  const hasCard = progress.guide.some((c) => c.levelId === level.id);
  const guide = hasCard
    ? progress.guide
    : [...progress.guide, { levelId: level.id, flaw: level.reveal.flaw, tip: level.reveal.tip, fooled: state.fooled }];
  return { ...progress, levels, guide };
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
