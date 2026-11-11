// Level keyboard shortcuts. Pure: no DOM, so node can test them.
//
// shortcutFor(event, shortcuts, { typing }) → the matching shortcut's id, or null.
// `event` is anything shaped like a KeyboardEvent ({ key, ctrlKey, … }).
// While the player is typing, only Escape counts: "/" and letters must reach
// the text box. Modifier chords (browser and OS shortcuts) and held-down
// repeats never match. Shift is allowed: some layouts need it to type "/".
const norm = (key) => (key === "Esc" ? "Escape" : String(key ?? ""));

export function shortcutFor(ev, shortcuts, { typing = false } = {}) {
  if (ev.ctrlKey || ev.metaKey || ev.altKey || ev.repeat) return null;
  const key = norm(ev.key);
  if (!key || (typing && key !== "Escape")) return null;
  const hit = shortcuts.find((s) => norm(s.key).toLowerCase() === key.toLowerCase());
  return hit ? hit.id : null;
}

// What the on-screen key cap shows.
export const keyCap = (key) => (norm(key) === "Escape" ? "Esc" : norm(key).toUpperCase());

// The aria-keyshortcuts value: a UI Events key value ("/" is a key value; "Slash" is a code, not a key).
export const ariaKey = (key) => (norm(key).length === 1 ? norm(key).toUpperCase() : norm(key));

// How the shortcut reads in an accessible name: "Almanac, shortcut slash".
const SPOKEN = { "/": "slash" };
export const keyName = (key) => SPOKEN[norm(key)] || ariaKey(key);
