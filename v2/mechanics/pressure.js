// Level 5: time and talk cost the garden. Each message on a pressure step,
// and each tick while you linger after the pitch, spends the next effect in step.pressure.effects.
// Once they're all spent nothing more happens (the meadow can only wilt so far).
// Pure; the reducer applies the effect.
export function nextPressureEffect(step, state) {
  return step.pressure?.effects?.[state.pressure] ?? null;
}

// 0…1, for the moon/sky CSS (--pressure).
export function pressureLevel(step, state) {
  const n = step?.pressure?.effects?.length || 0;
  return n ? Math.min(1, state.pressure / n) : 0;
}

// Whether the view's clock should run: only on a step with timed pressure
// (tickMs; without it pressure is chat-only), only once the helper has
// made its pitch (phase advice; reading the question costs nothing, and never
// after they walk away), and never while the tab is hidden.
export function shouldTick(step, phase, hidden) {
  return Boolean(step?.pressure?.tickMs > 0) && phase === "advice" && !hidden;
}

// Level 5's phone: how wilted the garden looks behind it, 0…4. Every
// follow-up question (state.chatted) and every "keep talking" (state.stayed)
// is time not spent on the beds, so the wilt steps up every two of them and
// never goes back down (the plants' own art shows what was put right). A
// caught ending blooms: by morning everything is fresh again.
export const WILT_MAX = 4;
export function wiltLevel(state) {
  if (state.phase === "reveal" && !state.lastFooled) return 0;
  const talks = (state.chatted || 0) + (state.stayed || 0);
  return Math.min(WILT_MAX, Math.ceil(talks / 2));
}
