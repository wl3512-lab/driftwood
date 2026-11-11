// Fills {name}, {placed:carrot}, {other:carrot} in level text. Unknown keys
// stay as written, so a missing value is visible in testing, not silently blank.
export const PLACEHOLDER = /\{([a-z]+(?::[a-z]+)?)\}/gi;

export function fill(text, vars = {}) {
  return String(text ?? "").replace(PLACEHOLDER, (m, key) => (vars[key] != null ? String(vars[key]) : m));
}
