// Level 5's clock: while the player lingers on a pressure step's advice, the
// garden pays. One { type: "tick" } every step.pressure.tickMs, only while
// mechanics/pressure.js says it should run (advice phase, tab visible). The
// reducer ignores stray ticks, so the clock errs on the side of stopping.
import { shouldTick } from "../mechanics/pressure.js";

export function createPressureClock(dispatch, doc = document) {
  let timer = null;
  let grace = null;
  let current = null; // { step, phase }

  const stop = () => { if (timer) clearInterval(timer); if (grace) clearTimeout(grace); timer = null; grace = null; };
  const start = () => {
    stop();
    if (!current || !shouldTick(current.step, current.phase, doc.hidden, current.paused)) return;
    const tick = () => { if (shouldTick(current.step, current.phase, doc.hidden, current.paused)) dispatch({ type: "tick" }); };
    // Give every new reply a reading window. Returning from a source starts a
    // fresh window; inspection never spends health or forces a hurried choice.
    grace = setTimeout(() => {
      grace = null;
      tick();
      timer = setInterval(tick, current.step.pressure.tickMs);
    }, Math.max(current.step.pressure.tickMs, current.readingMs));
  };
  const onVisibility = () => start();
  doc.addEventListener("visibilitychange", onVisibility);

  return {
    // Call on every render; restarts when the step, phase, pause or the
    // helper's line changes (a new line gets a fresh reading window).
    sync(step, phase, { paused = false, readingMs = 0, line = "" } = {}) {
      if (current && current.step === step && current.phase === phase && current.paused === paused && current.line === line) return;
      current = { step, phase, paused, readingMs, line };
      start();
    },
    running: () => timer != null || grace != null,
    destroy() {
      stop();
      current = null;
      doc.removeEventListener("visibilitychange", onVisibility);
    },
  };
}
