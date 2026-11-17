// Phones held upright get one screen first: turn the phone sideways. The
// garden, the dock and the almanac need the width; upright, the questions
// stack under a garden too short to drag in. Never a hard lock (WCAG 1.3.4):
// "Play upright anyway" closes it for the rest of the visit.
// Test runs skip it with window.__dwRotate = false (scripts/test-mute.js).
const UPRIGHT_PHONE = "(orientation: portrait) and (max-width: 600px) and (pointer: coarse)";
const KEY = "dw_upright_ok";

export function mountRotate(app) {
  if (window.__dwRotate === false || !window.matchMedia) return;
  const mq = window.matchMedia(UPRIGHT_PHONE);
  const dismissed = () => { try { return sessionStorage.getItem(KEY) === "1"; } catch { return false; } };

  const el = document.createElement("div");
  el.className = "rotate";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.setAttribute("aria-labelledby", "rotate-title");
  el.innerHTML = `
    <div class="rotate__phone" aria-hidden="true"><span class="rotate__screen"></span></div>
    <h1 class="rotate__title" id="rotate-title">Turn your phone sideways</h1>
    <p class="rotate__why">The garden needs the room.</p>
    <button type="button" class="rotate__anyway">Play upright anyway</button>`;

  const sync = () => {
    const show = mq.matches && !dismissed();
    if (show && !el.isConnected) document.body.append(el);
    if (!show && el.isConnected) el.remove();
    app.inert = show;
    if (show) el.querySelector(".rotate__anyway").focus({ preventScroll: true });
  };
  el.querySelector(".rotate__anyway").addEventListener("click", () => {
    try { sessionStorage.setItem(KEY, "1"); } catch { /* private mode: closes for now */ }
    el.remove();
    app.inert = false;
    mq.removeEventListener?.("change", sync);
  });
  mq.addEventListener?.("change", sync);
  sync();
}
