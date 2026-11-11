// Tiny DOM helpers shared by every screen.

// h("button", { class: "btn", onclick: fn }, "Label") → <button class="btn">Label</button>
// Attributes set to null/false are skipped; true becomes an empty attribute.
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value == null || value === false) continue;
    if (key === "class") el.className = value;
    else if (key.startsWith("on") && typeof value === "function") el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value === true ? "" : String(value));
  }
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    el.append(child.nodeType ? child : String(child));
  }
  return el;
}

// Moves focus to [data-autofocus] inside root, else its first enabled control.
export function focusFirst(root) {
  if (!root) return;
  const target = root.querySelector("[data-autofocus]") || root.querySelector("button:not([disabled]), input");
  target?.focus({ preventScroll: true });
}

// Speaks text through the page's single polite live region (#sr-live).
export function announce(text) {
  const live = document.getElementById("sr-live");
  if (!live || !text) return;
  live.textContent = "";
  requestAnimationFrame(() => { live.textContent = text; });
}

// Touch devices: don't auto-focus text inputs (it throws the keyboard up).
export const finePointer = () => window.matchMedia?.("(pointer: fine)").matches ?? true;
