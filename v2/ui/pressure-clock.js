// Level 5's clock: while the player lingers on a pressure step's advice, the
// garden pays. One { type: "tick" } every step.pressure.tickMs, only while
// mechanics/pressure.js says it should run (advice phase, tab visible). The
// reducer ignores stray ticks, so the clock errs on the side of stopping.
import { shouldTick } from "../mechanics/pressure.js";

export function createPressureClock(dispatch, doc = document) {
  let timer = null;
  let current = null; // { step, phase }

  const stop = () => { if (timer) clearInterval(timer); timer = null; };
  const start = () => {
    stop();
    if (!current || !shouldTick(current.step, current.phase, doc.hidden)) return;
    timer = setInterval(() => dispatch({ type: "tick" }), current.step.pressure.tickMs);
  };
  const onVisibility = () => start();
  doc.addEventListener("visibilitychange", onVisibility);

  return {
    // Call on every render; restarts only when the step or phase changes, so
    // a chat reply mid-step doesn't reset the countdown.
    sync(step, phase) {
      if (current && current.step === step && current.phase === phase) return;
      current = { step, phase };
      start();
    },
    running: () => timer != null,
    destroy() {
      stop();
      current = null;
      doc.removeEventListener("visibilitychange", onVisibility);
    },
  };
}
