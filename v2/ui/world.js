// The garden world behind the map, splash, name, field guide and ending: one
// pixel-art panorama (sky, sun or moon, hills, fence, grass, path) drawn into a
// small canvas and scaled up with crisp square pixels.
//
// Time of day is a number t from 0 to 5: t = k means "Level k+1 is next"
// (0 morning, 1 midday, 2 golden hour, 3 dusk, 4 night with the moon), and 5
// is the dawn after the last level. While a level is next, the sun (the moon
// at night) stands over that level's bed and shines a stepped beam onto it.
// Fractional t is the in-between of a transition: the sun travels to the next
// bed and the sky shifts.
//
// The scene is drawn once, and again only on resize or while a transition runs.

const HZ = 0.53; // the horizon (bottom of the sky), as a fraction of the height
const PATH_TOP = 0.81, PATH_BOTTOM = 0.94;
export const BED_X = [0.12, 0.3, 0.5, 0.7, 0.88];

const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
const mix = (a, b, f) => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * f));
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const lerp = (a, b, f) => a + (b - a) * f;
const ease = (f) => (f < 0.5 ? 2 * f * f : 1 - ((-2 * f + 2) ** 2) / 2);

// One entry per whole t: 0 morning … 4 night, 5 dawn.
const SKY_TOP = ["#6fc0ee", "#58aef0", "#7fb6e6", "#4a3f8f", "#0f1538", "#5865b0"].map(hex);
const SKY_BOT = ["#cdeef5", "#b8e4f4", "#ffd089", "#ff9466", "#33306a", "#ffbf94"].map(hex);
const TINT = [["#ffffff", 0], ["#ffffff", 0], ["#ff9c40", 0.14], ["#7a3a78", 0.28], ["#0c1440", 0.58], ["#ff8a70", 0.16]]
  .map(([c, a]) => [hex(c), a]);
const STARS = [0, 0, 0, 0.25, 1, 0.12];
const SUN_Y = [0.36, 0.22, 0.3, 0.52]; // the sun's height (fraction of the sky) over beds 1–4
const MOON_Y = 0.3;
const DAWN = { x: 0.5, y: 0.74 };

const C = {
  farHill: hex("#86b06c"), nearHill: hex("#5f9a4c"),
  grass: hex("#6aa84a"), grass2: hex("#5f9c40"), grassDark: hex("#4f8a36"), tuft: hex("#3f7a2c"),
  fence: hex("#8a5a2b"), post: hex("#6e4a2a"), postTop: hex("#a8743f"),
  path: hex("#d4a46b"), pathEdge: hex("#e6bd85"), pathDark: hex("#b6824f"), pebble: hex("#a87a4a"),
  sunCore: hex("#fff6c8"), sunRing: hex("#ffd75e"), duskCore: hex("#ffe2a0"), duskRing: hex("#ff9a3c"),
  moon: hex("#fff3c0"), star: hex("#ffffff"), beamDay: hex("#fff4c0"), beamNight: hex("#d8e4ff"),
};

// Interpolates a per-whole-t table at fractional t.
function at(table, t) {
  const k = Math.min(table.length - 1, Math.floor(t));
  const f = t - k;
  if (k >= table.length - 1 || f === 0) return table[k];
  const a = table[k], b = table[k + 1];
  return Array.isArray(a) ? mix(a, b, f) : lerp(a, b, f);
}

// A tiny seeded random, so the stars and tufts sit still between redraws.
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// Where the sun or moon is at time t, in canvas pixels. bedX(i) is bed i's
// centre. kind "sun" | "moon"; beam: whether it shines on a bed (and which x).
function body(t, W, H, bedX) {
  const sky = H * HZ;
  const at2 = (k) => {
    if (k <= 3) return { kind: "sun", x: bedX(k), y: sky * SUN_Y[k], beam: true };
    if (k === 4) return { kind: "moon", x: bedX(4), y: sky * MOON_Y, beam: true };
    return { kind: "sun", x: W * DAWN.x, y: sky * DAWN.y, beam: false };
  };
  const k = Math.floor(t), f = t - k;
  if (f === 0 || k >= 5) return at2(Math.min(5, k));
  const a = at2(k), b = at2(k + 1);
  if (a.kind === b.kind && k + 1 <= 3) {
    const e = ease(f);
    return { kind: "sun", x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e) - Math.sin(Math.PI * e) * sky * 0.08, beam: true };
  }
  // The body changes (sun sets, moon rises; moon sets, dawn sun rises): the
  // first half sinks the old one below the hills, the second raises the new.
  const below = sky + H * 0.08;
  if (f < 0.5) {
    const e = ease(f / 0.5);
    return { kind: a.kind, x: lerp(a.x, b.x, e * 0.6), y: lerp(a.y, below, e), beam: false };
  }
  const e = ease((f - 0.5) / 0.5);
  return { kind: b.kind, x: b.x, y: lerp(below, b.y, e), beam: false };
}

// Paints the whole scene for time t into an ImageData-sized buffer.
function paint(img, W, H, t, beds, beamOn = true) {
  const d = img.data;
  const set = (x, y, c) => {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4;
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
  };
  const blend = (x, y, c, a) => {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4;
    d[i] = d[i] + (c[0] - d[i]) * a; d[i + 1] = d[i + 1] + (c[1] - d[i + 1]) * a; d[i + 2] = d[i + 2] + (c[2] - d[i + 2]) * a;
  };
  const rect = (x0, y0, w, h, c) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, c); };

  // TINT holds [colour, amount] pairs: blend each part on its own.
  const tintC = at(TINT.map((e) => e[0]), t), tintA = at(TINT.map((e) => e[1]), t);
  const tint = (c) => mix(c, tintC, tintA);
  const top = at(SKY_TOP, t), bot = at(SKY_BOT, t);
  const sky = Math.round(H * HZ);

  // Sky: seven flat bands, with a two-row checkerboard dither where they meet.
  const BANDS = 7;
  const bandH = sky / BANDS;
  const skyAt = (y) => mix(top, bot, Math.min(BANDS - 1, Math.floor(y / bandH)) / (BANDS - 1));
  for (let y = 0; y < sky; y++) {
    const b = Math.floor(y / bandH);
    const c = mix(top, bot, Math.min(BANDS - 1, b) / (BANDS - 1));
    const nextC = mix(top, bot, Math.min(BANDS - 1, b + 1) / (BANDS - 1));
    const edge = (b + 1) * bandH - y <= 2 && b < BANDS - 1;
    for (let x = 0; x < W; x++) set(x, y, edge && (x + y) % 2 === 0 ? nextC : c);
  }

  // Stars: single square pixels (a few plus-shaped), more as night falls.
  const starAmt = at(STARS, t);
  if (starAmt > 0) {
    const r = rng(7);
    const n = Math.round((W * sky) / 260);
    for (let i = 0; i < n; i++) {
      const x = r() * W, y = r() * sky * 0.85, big = r() < 0.12, keep = r();
      if (keep > starAmt) continue;
      set(x, y, C.star);
      if (big) { set(x - 1, y, C.star); set(x + 1, y, C.star); set(x, y - 1, C.star); set(x, y + 1, C.star); }
    }
  }

  // The sun or moon (drawn before the hills, so it can set behind them).
  const bedX = (i) => (beds[i] ? beds[i].x : BED_X[i] * W);
  const b = body(t, W, H, bedX);
  const R = Math.max(5, Math.round(H * 0.055));
  if (b.kind === "sun") {
    const dusk = clamp01((t - 2) / 1.5) * (t < 4.5 ? 1 : 0.4);
    const core = mix(C.sunCore, C.duskCore, dusk), ring = mix(C.sunRing, C.duskRing, dusk);
    for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
      const dd = Math.sqrt(x * x + y * y);
      if (dd <= R + 0.3) set(b.x + x, b.y + y, dd <= R - 2 ? core : ring);
    }
    // Stepped rays: eight dashed spokes.
    const rays = t < 3.6 || t > 4.5;
    if (rays) {
      for (let k = 0; k < 8; k++) {
        const a = (Math.PI / 4) * k;
        const dx = Math.round(Math.cos(a) * 100) / 100, dy = Math.round(Math.sin(a) * 100) / 100;
        for (let s = R + 3; s < R + 3 + Math.round(R * 0.9); s++) {
          if ((s - R) % 3 === 2) continue;
          set(b.x + dx * s, b.y + dy * s, ring);
        }
      }
    }
  } else {
    const r2 = Math.round(R * 0.85);
    for (let y = -r2; y <= r2; y++) for (let x = -r2; x <= r2; x++) {
      const inA = x * x + y * y <= r2 * r2 + 0.5;
      const cx = x - r2 * 0.5, cy = y + r2 * 0.35;
      const inB = cx * cx + cy * cy <= (r2 * 0.82) ** 2;
      if (inA && !inB) set(b.x + x, b.y + y, C.moon);
    }
  }

  // Hills: a hazy far range, then a nearer one.
  const haze = mix(tint(C.farHill), bot, 0.35);
  const near = tint(C.nearHill);
  for (let x = 0; x < W; x++) {
    const fx = x / W;
    const far = sky - Math.round(H * (0.1 + 0.05 * Math.sin(fx * 7.1 + 0.6) + 0.03 * Math.sin(fx * 17.3)));
    const nr = sky - Math.round(H * (0.045 + 0.035 * Math.sin(fx * 5.3 + 2.1) + 0.015 * Math.sin(fx * 23.1)));
    for (let y = Math.max(0, far); y < sky; y++) set(x, y, haze);
    for (let y = Math.max(0, nr); y < sky; y++) set(x, y, near);
  }

  // Grass, with column stripes and a darker strip along the fence line.
  const g1 = tint(C.grass), g2 = tint(C.grass2), gd = tint(C.grassDark), tuft = tint(C.tuft);
  for (let y = sky; y < H; y++) {
    for (let x = 0; x < W; x++) set(x, y, y < sky + 3 ? gd : (Math.floor(x / 3) % 2 ? g2 : g1));
  }

  // Fence along the horizon: two rails, posts every ten pixels.
  const fh = Math.max(6, Math.round(H * 0.06));
  const ft = sky - fh + 2;
  const rail = tint(C.fence), post = tint(C.post), postTop = tint(C.postTop);
  rect(0, ft + Math.round(fh * 0.3), W, 1, rail);
  rect(0, ft + Math.round(fh * 0.66), W, 1, rail);
  for (let x = 3; x < W; x += 10) { rect(x, ft, 2, fh, post); rect(x, ft, 2, 1, postTop); }

  // Path near the bottom: lit top edge, darker bottom edge, a few pebbles.
  const p0 = Math.round(H * PATH_TOP), p1 = Math.round(H * PATH_BOTTOM);
  const path = tint(C.path), pathEdge = tint(C.pathEdge), pathDark = tint(C.pathDark), peb = tint(C.pebble);
  for (let y = p0; y < p1; y++) {
    const c = y === p0 ? pathEdge : y >= p1 - 2 ? pathDark : path;
    for (let x = 0; x < W; x++) set(x, y, c);
  }
  const pr = rng(11);
  for (let i = 0; i < W / 9; i++) set(pr() * W, p0 + 2 + pr() * (p1 - p0 - 5), peb);
  // Grass tufts on the lawn, off the path.
  const tr = rng(3);
  for (let i = 0; i < W / 6; i++) {
    const x = Math.round(tr() * W), y = Math.round(sky + 6 + tr() * (H - sky - 8));
    if (y >= p0 - 1 && y <= p1 + 1) continue;
    set(x, y, tuft); set(x - 1, y - 1, tuft); set(x + 1, y - 1, tuft);
  }

  // The beam: a stepped light cone from the sun (or moon) down onto its bed.
  if (b.beam && beamOn) {
    // Between two beds the beam's target slides along with the sun.
    const k = Math.min(4, Math.floor(t)), e = ease(t - k);
    const A = beds[k], B = beds[Math.min(4, k + 1)] || A;
    const fallback = { x: b.x, top: H * 0.72, w: W * 0.12, h: H * 0.04 };
    const bed = A && B ? { x: lerp(A.x, B.x, e), top: lerp(A.top, B.top, e), w: lerp(A.w, B.w, e), h: lerp(A.h, B.h, e) } : fallback;
    const y0 = Math.round(b.y + R + 2), y1 = Math.round(bed.top);
    const night = clamp01((t - 3.5) / 0.5) * (t < 4.5 ? 1 : 0);
    const col = mix(C.beamDay, C.beamNight, night);
    const alpha = lerp(0.26, 0.2, night);
    for (let y = y0; y < y1; y++) {
      const step = Math.floor((y - y0) / 3) * 3; // widen in steps of three rows
      const f = (step) / Math.max(1, y1 - y0);
      const w = Math.round(lerp(R * 1.6, bed.w * 1.1, f) / 2) * 2;
      const cx = Math.round(lerp(b.x, bed.x, f));
      for (let x = cx - w / 2; x < cx + w / 2; x++) blend(x, y, col, alpha);
    }
    // A pool of light on the ground round the bed.
    const py = Math.round(bed.top + bed.h);
    for (let y = py - 1; y <= py + 2; y++) {
      const w = Math.round(bed.w * (1.2 - Math.abs(y - py) * 0.1) / 2) * 2;
      for (let x = Math.round(bed.x - w / 2); x < bed.x + w / 2; x++) blend(x, y, col, alpha * 0.8);
    }
  }
  return b;
}

// Mounts the scene as the first child of `host` (which must be position:
// relative and clip its overflow). getBeds() returns the bed boxes' rects in
// CSS pixels relative to host ({x: centre, top, w, h}); beds may be empty.
// beam: false leaves out the light cone (screens without beds). fixed: true
// pins the sky to the window, for screens that scroll over it.
export function mountWorld(host, { time = 0, getBeds = () => [], bedIds = [], beam = true, fixed = false } = {}) {
  const canvas = document.createElement("canvas");
  canvas.className = fixed ? "world__sky world__sky--fixed" : "world__sky";
  canvas.setAttribute("aria-hidden", "true");
  host.prepend(canvas);
  const ctx = canvas.getContext("2d", { alpha: false });
  let t = time, P = 4, W = 0, H = 0, img = null, raf = 0, timer = 0, frame = 0, alive = true;

  function measure() {
    const r = fixed ? { width: window.innerWidth, height: window.innerHeight } : host.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    P = Math.max(3, Math.round(Math.min(r.height / 170, r.width / 300)));
    W = Math.ceil(r.width / P); H = Math.ceil(r.height / P);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; img = null; }
    canvas.style.width = `${W * P}px`; canvas.style.height = `${H * P}px`;
    return true;
  }
  function draw() {
    frame = 0;
    if (!alive || !ctx || !measure()) return;
    if (!img) img = ctx.createImageData(W, H);
    const beds = getBeds().map((b) => ({ x: b.x / P, top: b.top / P, w: b.w / P, h: b.h / P }));
    const b = paint(img, W, H, t, beam ? beds : [], beam);
    ctx.putImageData(img, 0, 0);
    if (Number.isInteger(t)) {
      host.dataset.time = String(t);
      host.dataset.sunX = String(Math.round(b.x * P));
      host.dataset.sunY = String(Math.round(b.y * P));
      if (t <= 4 && bedIds[t]) host.dataset.sun = bedIds[t]; else delete host.dataset.sun;
    }
  }
  const schedule = () => { if (!frame) frame = requestAnimationFrame(draw); };
  const ro = typeof ResizeObserver === "function" ? new ResizeObserver(schedule) : null;
  ro?.observe(host);
  if (fixed) window.addEventListener("resize", schedule);
  draw();

  // Travels from the current time to `to` over `ms`, then settles exactly on `to`.
  function travel(to, ms = 1600) {
    cancelAnimationFrame(raf); clearTimeout(timer);
    const from = t;
    if (from === to || ms <= 0) { t = to; draw(); delete host.dataset.moving; return Promise.resolve(); }
    host.dataset.moving = "1";
    return new Promise((resolve) => {
      const start = performance.now();
      const end = () => {
        cancelAnimationFrame(raf); clearTimeout(timer);
        t = to; draw(); delete host.dataset.moving; resolve();
      };
      const step = (now) => {
        const f = Math.min(1, (now - start) / ms);
        if (f >= 1 || !alive) { end(); return; }
        t = from + (to - from) * f;
        draw();
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      timer = setTimeout(end, ms + 400); // a hidden tab never runs rAF: settle anyway
    });
  }

  return {
    redraw: schedule,
    travel,
    destroy() { alive = false; cancelAnimationFrame(raf); cancelAnimationFrame(frame); clearTimeout(timer); ro?.disconnect(); window.removeEventListener("resize", schedule); },
  };
}

// The time a progress state shows: the index of the next level to play, or 5
// when every level is done.
export function timeFor(nextIndex, allDone) {
  return allDone ? 5 : Math.max(0, Math.min(4, nextIndex));
}
