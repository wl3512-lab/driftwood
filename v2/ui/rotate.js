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
  const landscape = window.matchMedia("(orientation: landscape) and (max-height: 500px) and (pointer: coarse)");
  const iphone = /iPhone|iPod/.test(navigator.userAgent);
  const installed = navigator.standalone || window.matchMedia("(display-mode: standalone)").matches;
  const dismissed = () => { try { return sessionStorage.getItem(KEY) === "1"; } catch { return false; } };
  let helpSeen = false;
  let uprightOk = dismissed();
  try { helpSeen = sessionStorage.getItem("dw_phone_help_seen") === "1"; } catch { /* private mode */ }

  const el = document.createElement("div");
  el.className = "rotate";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.setAttribute("aria-labelledby", "rotate-title");
  el.innerHTML = `
    <div class="rotate__phone" aria-hidden="true"><span class="rotate__screen"></span></div>
    <h1 class="rotate__title" id="rotate-title">Turn your phone sideways</h1>
    <p class="rotate__why">The garden needs the room.</p>
    <div class="rotate__help" hidden>
      <p>In iPhone Safari, tap the Page Menu next to the address bar, then Hide Toolbar. You may need to tap … first.</p>
      <p>For an app-style view, tap Share → Add to Home Screen. Turn on Open as Web App if shown, tap Add, then open Driftwood from its new icon.</p>
    </div>
    <button type="button" class="rotate__anyway">Play upright anyway</button>`;

  const sync = () => {
    const help = iphone && !installed && landscape.matches && !helpSeen;
    const upright = mq.matches && !uprightOk;
    const show = upright || help;
    el.classList.toggle("rotate--help", help);
    el.querySelector(".rotate__title").textContent = help ? "More room to play" : "Turn your phone sideways";
    el.querySelector(".rotate__why").textContent = help ? "Hide Safari's address bar for more room to play." : "The garden needs the room.";
    el.querySelector(".rotate__help").hidden = !help;
    el.querySelector(".rotate__anyway").textContent = help ? "Play Driftwood ▸" : "Play upright anyway";
    if (show && !el.isConnected) document.body.append(el);
    if (!show && el.isConnected) el.remove();
    app.inert = show;
    if (show) el.querySelector(".rotate__anyway").focus({ preventScroll: true });
  };
  el.querySelector(".rotate__anyway").addEventListener("click", () => {
    if (el.classList.contains("rotate--help")) {
      helpSeen = true;
      try { sessionStorage.setItem("dw_phone_help_seen", "1"); } catch { /* private mode */ }
    } else {
      uprightOk = true;
      try { sessionStorage.setItem(KEY, "1"); } catch { /* private mode */ }
    }
    el.remove();
    app.inert = false;
  });
  mq.addEventListener?.("change", sync);
  landscape.addEventListener?.("change", sync);
  sync();
}
