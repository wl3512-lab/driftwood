// Shared animation helpers for the action kinds: WAAPI only, every wait
// capped by a timeout so a dropped animation event can never stall a level.
export const wait = (ms) => new Promise((ok) => setTimeout(ok, Math.max(0, ms)));

// Chores run fast (Lucy's playtest: "the animation/cooldown in between take
// too long"): every animation plays at PACE of the length a kind writes, and
// no single one (delay and repeats included) runs past MAX_MS. Kinds keep
// writing their durations in the old, slow units; only this scales them.
export const PACE = 0.3;
export const MAX_MS = 250;
export function paced({ duration = 0, delay = 0, iterations = 1 } = {}) {
  const n = Number.isFinite(iterations) ? Math.max(1, iterations) : 1;
  let d = duration * PACE;
  let w = delay * PACE;
  const total = w + d * n;
  if (total > MAX_MS) { const k = MAX_MS / total; d *= k; w *= k; }
  return { duration: Math.round(d), delay: Math.round(w), ms: Math.round(w + d * n) };
}

// Animate `el` and resolve when it ends, or after its length + 250 ms at most.
export function play(el, frames, opts) {
  const { duration, delay, ms } = paced(opts);
  let anim = null;
  try { anim = el.animate(frames, { fill: "forwards", ...opts, duration, delay }); } catch (_) { /* no WAAPI: just wait */ }
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

// Result labels (a finger test's "Top inch: dry", a probe's readout) that sit
// where a tool's liquid or sprite will be: they fade out before the pour and
// back in after, so the stream never runs across their words.
export function clearLabels(layer, nodes, { reduced = false } = {}) {
  const scene = layer?.parentElement;
  const boxes = nodes.filter(Boolean).map((n) => n.getBoundingClientRect()).filter((b) => b.width || b.height);
  const pad = 8;
  const hit = !scene ? [] : [...scene.querySelectorAll(":scope > .act-marks > .act-mark--text")].filter((m) => {
    const r = m.getBoundingClientRect();
    return boxes.some((b) => r.left < b.right + pad && r.right > b.left - pad && r.top < b.bottom + pad && r.bottom > b.top - pad);
  });
  const fade = (from, to) => Promise.all(hit.map((m) => play(m, [{ opacity: from }, { opacity: to }], { duration: reduced ? 0 : 140, easing: "steps(2, end)" })));
  return {
    labels: hit,
    hide: () => fade(1, 0),
    show: async () => {
      await fade(0, 1);
      for (const m of hit) { try { m.getAnimations().forEach((x) => x.cancel()); } catch (_) { /* fine */ } }
    },
  };
}

export const rand = (seed) => { let x = seed * 9301 + 49297; return () => ((x = (x * 9301 + 49297) % 233280) / 233280); };

// A readable name for an item or spot id: "l3-spray-bottle" → "spray bottle".
export const words = (id) => String(id || "").replace(/^l[1-5]-/, "").replace(/-/g, " ");
export const plural = (w) => (/[^aeiou]y$/.test(w) ? `${w.slice(0, -1)}ies` : /(ea|al)f$/.test(w) ? `${w.slice(0, -1)}ves` : /ife$/.test(w) ? `${w.slice(0, -2)}ves` : /(s|sh|ch|x)$/.test(w) ? `${w}es` : `${w}s`);
