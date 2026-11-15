// The sound switch: a pixel speaker button. aria-pressed="true" while sound
// is on; the choice is saved (dw_audio_muted) and every switch on the page
// follows it. 44px square on touch screens (css/audio.css).
import { isMuted, setMuted, onMuteChange } from "./index.js";

const SPEAKER = [
  "....#.....",
  "...##.....",
  "###.#.....",
  "#...#.....",
  "#...#.....",
  "###.#.....",
  "...##.....",
  "....#.....",
];
const WAVES = [[6, 2], [7, 1], [7, 3], [7, 4], [7, 6], [6, 5], [8, 0], [9, 2], [9, 3], [9, 4], [9, 5], [8, 7]];
const CROSS = [[6, 2], [7, 3], [8, 4], [9, 5], [9, 2], [8, 3], [6, 5], [7, 4]];

function icon() {
  const px = [];
  SPEAKER.forEach((row, y) => [...row].forEach((c, x) => { if (c === "#") px.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`); }));
  const waves = WAVES.map(([x, y]) => `<rect x="${x}" y="${y}" width="1" height="1"/>`).join("");
  const cross = CROSS.map(([x, y]) => `<rect x="${x}" y="${y}" width="1" height="1"/>`).join("");
  return `<svg class="snd__icon" viewBox="-1 -2 12 12" width="24" height="24" aria-hidden="true" focusable="false" shape-rendering="crispEdges">`
    + `<g fill="currentColor">${px.join("")}<rect x="1" y="3" width="3" height="2"/></g>`
    + `<g class="snd__on" fill="currentColor">${waves}</g>`
    + `<g class="snd__off" fill="#c0392b">${cross}</g></svg>`;
}

// soundToggle({ className }) → <button>; it keeps itself in step with the mute setting.
export function soundToggle({ className = "" } = {}) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = `snd ${className}`.trim();
  b.innerHTML = icon();
  const sync = () => {
    const on = !isMuted();
    b.setAttribute("aria-pressed", String(on));
    b.setAttribute("aria-label", "Sound");
    b.title = on ? "Sound on (click to mute)" : "Sound off (click to unmute)";
    b.dataset.on = String(on);
  };
  sync();
  b.addEventListener("click", () => setMuted(!isMuted()));
  // the listener drops itself once the button has left the page
  const off = onMuteChange(() => { if (!b.isConnected) { off(); return; } sync(); });
  return b;
}
