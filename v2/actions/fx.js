// Shared animation helpers for the action kinds: WAAPI only, every wait
// capped by a timeout so a dropped animation event can never stall a level.
export const wait = (ms) => new Promise((ok) => setTimeout(ok, Math.max(0, ms)));

// Animate `el` and resolve when it ends, or after duration + 250 ms at most.
export function play(el, frames, opts) {
  const ms = (opts.duration || 0) + (opts.delay || 0);
  let anim = null;
  try { anim = el.animate(frames, { fill: "forwards", ...opts }); } catch (_) { /* no WAAPI: just wait */ }
  const done = anim?.finished?.catch(() => {}) ?? wait(ms);
  return Promise.race([done, wait(ms + 250)]);
}

// A throwaway sprite at (x, y) in the fx layer, centred on that point.
export function spawn(layer, node, x, y, cls = "") {
  const el = document.createElement("div");
  el.className = `act__fx${cls ? ` ${cls}` : ""}`;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.append(node);
  layer.append(el);
  return el;
}

// Run an animation and always clean up its sprites after.
export async function burst(nodes, run) {
  try { await run(); } finally { for (const n of nodes) n.remove(); }
}

export const rand = (seed) => { let x = seed * 9301 + 49297; return () => ((x = (x * 9301 + 49297) % 233280) / 233280); };

// A readable name for an item or spot id: "l3-spray-bottle" → "spray bottle".
export const words = (id) => String(id || "").replace(/^l[1-5]-/, "").replace(/-/g, " ");
export const plural = (w) => (/[^aeiou]y$/.test(w) ? `${w.slice(0, -1)}ies` : /(ea|al)f$/.test(w) ? `${w.slice(0, -1)}ves` : /ife$/.test(w) ? `${w.slice(0, -2)}ves` : /(s|sh|ch|x)$/.test(w) ? `${w}es` : `${w}s`);
