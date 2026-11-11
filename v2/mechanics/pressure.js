// Level 5: time and talk cost the garden. Each message on a pressure step,
// and each tick while you linger, spends the next effect in step.pressure.effects.
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
// (tickMs; without it pressure is chat-only), only while the player is asking
// or deciding (never after they walk away), and never while the tab is hidden.
export function shouldTick(step, phase, hidden) {
  return Boolean(step?.pressure?.tickMs > 0) && (phase === "ask" || phase === "advice") && !hidden;
}
