// Level 4's label token: a draggable plant label the player can drop on a bed
// to decide where something goes. Pointer events only (mouse, pen, touch);
// the bed buttons in the speech bubble stay the accessible path, with 1…n
// key caps, and dispatch the same { type: "place", bed } action.
//
// The token lives in the bubble's action row. Dragging moves it with a CSS
// transform; on release the bed under the pointer (if it is one of the
// allowed beds) gets the placement. Nothing is dispatched for a miss.
import { h } from "./dom.js";

export function labelToken({ item, label, beds, onDrop, sprite = "./art/plant-label.svg" }) {
  const token = h("div", {
    class: "label-token", "data-fid": `token-${item}`, "aria-hidden": "true", title: "Drag onto a bed",
  },
  h("img", { src: sprite, alt: "", width: 28, height: 28 }),
  h("span", { class: "label-token__text" }, label));

  let drag = null; // { id, x, y, over }
  const allowed = new Set(beds);
  const bedAt = (x, y) => {
    const el = document.elementFromPoint(x, y)?.closest?.("[data-bed]");
    return el && allowed.has(el.dataset.bed) ? el : null;
  };
  const clearOver = () => {
    if (drag?.over) drag.over.classList.remove("bed--over");
    if (drag) drag.over = null;
  };

  token.addEventListener("pointerdown", (ev) => {
    if (drag || (ev.button != null && ev.button !== 0)) return;
    drag = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, over: null };
    token.setPointerCapture?.(ev.pointerId);
    token.classList.add("label-token--drag");
    ev.preventDefault();
  });

  token.addEventListener("pointermove", (ev) => {
    if (!drag || ev.pointerId !== drag.id) return;
    token.style.transform = `translate(${ev.clientX - drag.x}px, ${ev.clientY - drag.y}px)`;
    const bed = bedAt(ev.clientX, ev.clientY);
    if (bed !== drag.over) {
      clearOver();
      drag.over = bed;
      bed?.classList.add("bed--over");
    }
  });

  const finish = (ev) => {
    if (!drag || ev.pointerId !== drag.id) return;
    const bed = ev.type === "pointerup" ? bedAt(ev.clientX, ev.clientY) : null;
    clearOver();
    drag = null;
    token.classList.remove("label-token--drag");
    token.style.transform = "";
    if (bed) onDrop(bed.dataset.bed);
  };
  token.addEventListener("pointerup", finish);
  token.addEventListener("pointercancel", finish);

  // Dragging must not scroll the page or select text underneath.
  token.style.touchAction = "none";
  return token;
}
