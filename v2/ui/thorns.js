// The red thorn vines from v1's loading screen, played once when the player
// presses Begin or Continue: four trunks creep in from the corners, sprout
// alternating thorns, split into branches, then the game moves on and the
// vines fade off the next screen. Ported from sketch.js (spawnThorns) and run
// a few growth steps per frame so it fits in under two seconds.
// Reduced motion skips straight to the next screen.

const GROW_MS = 1600; // vines grow, then the next screen opens under them
const FADE_MS = 450;  // and they fade off it
const STEPS_PER_FRAME = 3;

export function playThorns(onDone) {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { onDone(); return; }
  const cvs = document.createElement("canvas");
  cvs.className = "thorns";
  cvs.setAttribute("aria-hidden", "true");
  document.body.append(cvs);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = window.innerWidth, H = window.innerHeight;
  cvs.width = Math.round(W * dpr); cvs.height = Math.round(H * dpr);
  const ctx = cvs.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.lineCap = "round";
  const P = Math.PI, STEP = 2.8;
  const scale = Math.max(0.7, Math.min(1.3, Math.min(W, H) / 700)); // thinner vines on phones
  const branches = [];
  const rnd = Math.random;

  function spawn(x, y, angle, thick, spd, ml) {
    branches.push({
      x, y, angle, thick: thick * scale, spd, life: 0,
      maxLife: ml || 300 + rnd() * 200,
      wobble: (rnd() - 0.5) * 0.04, curl: (rnd() - 0.5) * 0.002,
      dist: 0, dead: false, pause: 0, phase: 0, thornSide: rnd() > 0.5 ? 1 : -1,
    });
  }
  // One trunk per corner, running along the long edge; branches peel inward.
  spawn(0, 0, 0.1, 6, 3);
  spawn(W, 0, P - 0.1, 6, 3);
  spawn(0, H, -0.1, 5, 3);
  spawn(W, H, P + 0.1, 5, 3);
  // A pair along the short edges too, so tall phone screens fill as well.
  if (H > W) { spawn(0, H * 0.45, -0.25, 4.5, 3); spawn(W, H * 0.55, P + 0.25, 4.5, 3); }

  function line(x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  function drawSegment(b, nx, ny, t) {
    ctx.strokeStyle = "rgba(0,0,0,0.65)"; ctx.lineWidth = t + 2;
    line(b.x + 2.2, b.y + 3.5, nx + 2.2, ny + 3.5);
    ctx.strokeStyle = "rgba(50,0,0,0.88)"; ctx.lineWidth = t;
    line(b.x + 0.4, b.y + 0.7, nx + 0.4, ny + 0.7);
    ctx.strokeStyle = `rgba(${152 + (rnd() * 42 | 0)},${3 + (rnd() * 14 | 0)},0,0.96)`; ctx.lineWidth = t * 0.76;
    line(b.x, b.y, nx, ny);
    if (t > 1.3) {
      const a = b.angle - P / 2, o = t * 0.23;
      ctx.strokeStyle = `rgba(255,${70 + (rnd() * 50 | 0)},6,0.36)`; ctx.lineWidth = Math.max(0.35, t * 0.18);
      line(b.x + Math.cos(a) * o, b.y + Math.sin(a) * o, nx + Math.cos(a) * o, ny + Math.sin(a) * o);
    }
  }
  function tri(ax, ay, bx, by, cx, cy) { ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(cx, cy); ctx.closePath(); ctx.fill(); }
  function drawThorn(b, t) {
    b.thornSide *= -1;
    const pa = b.angle + b.thornSide * P / 2;
    const tl = t * 3 + rnd() * t;
    const tx = b.x + Math.cos(pa) * tl, ty = b.y + Math.sin(pa) * tl;
    const bx = b.x + Math.cos(b.angle) * tl * 0.32, by = b.y + Math.sin(b.angle) * tl * 0.32;
    ctx.fillStyle = "rgba(0,0,0,0.52)"; tri(b.x + 1.8, b.y + 3, tx + 1.8, ty + 3, bx + 1.8, by + 3);
    ctx.fillStyle = `rgba(${180 + (rnd() * 48 | 0)},${5 + (rnd() * 18 | 0)},0,0.95)`; tri(b.x, b.y, tx, ty, bx, by);
    ctx.strokeStyle = `rgba(255,${50 + (rnd() * 38 | 0)},0,0.42)`; ctx.lineWidth = 0.5;
    line(b.x, b.y, tx * 0.72 + b.x * 0.28, ty * 0.72 + b.y * 0.28);
    if (t > 0.9 && rnd() < 0.15) { // a thin tendril off the thorn tip
      branches.push({ x: tx, y: ty, angle: pa + (rnd() - 0.5) * 0.7, thick: 0.55 + rnd() * 0.3, spd: 2, life: 0,
        maxLife: 18 + rnd() * 22, wobble: (rnd() - 0.5) * 0.18, curl: (rnd() - 0.5) * 0.012,
        dist: 0, dead: false, pause: 0, phase: 0, thornSide: 1, micro: true });
    }
  }

  let frame = 0;
  function grow() {
    for (let i = 0; i < branches.length; i++) {
      const b = branches[i];
      if (b.dead) continue;
      if (b.pause > 0) { b.pause--; continue; } // the tip "deciding" where to push
      if (b.life > 6 && rnd() < 0.009 + (b.life / b.maxLife) * 0.018) { b.pause = 3 + (rnd() * 8 | 0); continue; }
      b.phase += 0.25;
      const steps = Math.max(1, Math.round(b.spd * (0.5 + 0.5 * Math.abs(Math.sin(b.phase)))));
      for (let s = 0; s < steps; s++) {
        if (b.life >= b.maxLife) { b.dead = true; break; }
        b.wobble = b.wobble * 0.94 + b.curl + (rnd() - 0.5) * 0.011;
        b.angle += b.wobble + 0.003;
        const f = b.life / b.maxLife;
        const t = Math.max(0.35, b.thick * (1 - f * f * 0.92));
        const nx = b.x + Math.cos(b.angle) * STEP, ny = b.y + Math.sin(b.angle) * STEP;
        if (b.micro) {
          ctx.strokeStyle = `rgba(${145 + (rnd() * 35 | 0)},${3 + (rnd() * 10 | 0)},0,0.82)`; ctx.lineWidth = t;
          line(b.x, b.y, nx, ny);
        } else {
          drawSegment(b, nx, ny, t);
          if (b.dist % 14 < STEP * 1.1 && t > 0.6) drawThorn(b, t);
          if (t > 1.6 && b.life % (70 + (rnd() * 30 | 0)) === 0) {
            spawn(b.x, b.y, b.angle + (rnd() > 0.5 ? 1 : -1) * (P * 0.4 + rnd() * 0.45),
              t / scale * (0.5 + rnd() * 0.1), Math.max(2, b.spd - 1), 100 + rnd() * 120);
          }
        }
        b.x = nx; b.y = ny; b.life++; b.dist += STEP;
      }
    }
  }
  function tips() { // the glowing growing tip of each live vine
    branches.forEach((b, i) => {
      if (b.dead || b.micro) return;
      const f = b.life / b.maxLife;
      const t = Math.max(0.35, b.thick * (1 - f * f * 0.92));
      ctx.fillStyle = `rgba(255,78,4,${0.32 + Math.sin(frame * 0.28 + i * 1.3) * 0.16})`;
      ctx.beginPath(); ctx.arc(b.x, b.y, Math.max(0.7, t * 0.6), 0, P * 2); ctx.fill();
    });
  }

  const start = performance.now();
  let done = false;
  function finish() {
    if (done) return;
    done = true;
    onDone();
    cvs.classList.add("thorns--out");
    setTimeout(() => cvs.remove(), FADE_MS + 50);
  }
  function tick(now) {
    if (done) return;
    for (let k = 0; k < STEPS_PER_FRAME; k++) grow();
    tips();
    frame++;
    if (now - start >= GROW_MS) finish();
    else requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  setTimeout(finish, GROW_MS + 600); // never strand the player if frames stop (hidden tab)
}
