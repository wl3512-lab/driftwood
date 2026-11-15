// Level 4's pixel helpers for its own kinds (measure, furrow, sow-row,
// water-row): hard-edged blocks and steps() timing, no smooth glows.
export function block(w, h, css = "") {
  const el = document.createElement("div");
  el.style.cssText = `position:absolute; left:0; top:0; width:${Math.round(w)}px; height:${Math.round(h)}px; image-rendering:pixelated; pointer-events:none; ${css}`;
  return el;
}
// A spot on the soil that marks where Level 4's kinds have been: the stamp
// node for runner.stamp(), sized in px, drawn in flat pixel rows.
export function patch(w, h, color, css = "") {
  const el = block(w, h, `position:relative; background:${color}; ${css}`);
  // Knock the corners off so the patch reads as pixels, not a rounded blob.
  el.style.clipPath = "polygon(0 25%, 8% 25%, 8% 0, 92% 0, 92% 25%, 100% 25%, 100% 75%, 92% 75%, 92% 100%, 8% 100%, 8% 75%, 0 75%)";
  return el;
}
// Fade Level 4's marks of one sort out of the scene (they have done their job).
export function fadeMarks(selector, { delay = 0, ms = 600 } = {}) {
  for (const el of document.querySelectorAll(`.act-marks ${selector}`)) {
    const m = el.closest(".act-mark") || el;
    try {
      const anim = m.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms, delay, easing: "steps(4, end)", fill: "forwards" });
      anim.finished.then(() => m.remove(), () => {});
    } catch (_) { m.remove(); }
  }
}
// The furrow art is drawn lying across; Level 4's row runs down the bed.
export function turned(node) {
  node.style.transform = "rotate(90deg)";
  return node;
}
