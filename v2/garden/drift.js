// The "cozy that drifts" effect. amount: 0 (cozy) … 1 (fully soured).
// CSS does the rest from --drift: saturation drains, scanlines fade in,
// and at ≥ 0.5 the helper's bubble text starts to glitch (css/level.css).
export function setDrift(el, amount) {
  el.style.setProperty("--drift", String(amount));
  el.classList.toggle("is-drifting", amount >= 0.5);
}
