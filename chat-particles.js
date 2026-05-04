// Ambient behavior canvas — OffscreenCanvas Web Worker
// Runs particle simulation off the main thread.
// Modes: ambient (slow green drift), calm (vivid green settle), agitated (red scatter burst)

let canvas, ctx;
let W = 0, H = 0;
let mode = "ambient";
let particles = [];

// OKLCH-derived RGB values — tinted toward brand hue
const COLORS = {
  ambient:  { r: 0,   g: 168, b: 90  },  // dim green
  calm:     { r: 0,   g: 218, b: 112 },  // brand green #00E676 approx
  agitated: { r: 210, g: 45,  b: 45  },  // deep red
};

function makeParticle(m) {
  const c = COLORS[m] || COLORS.ambient;
  // Spawn along bottom edge with horizontal scatter
  const x = Math.random() * W;
  const y = H * 0.85 + Math.random() * H * 0.15;

  let vx, vy, size, maxLife;

  if (m === "agitated") {
    // Fast multi-directional burst, slightly biased upward
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.2 + Math.random() * 2.8;
    vx = Math.cos(angle) * speed;
    vy = Math.sin(angle) * speed - 1.2;
    size = 1.5 + Math.random() * 2.5;
    maxLife = 45 + Math.floor(Math.random() * 35);
  } else if (m === "calm") {
    vx = (Math.random() - 0.5) * 0.7;
    vy = -(0.5 + Math.random() * 1.0);
    size = 1.0 + Math.random() * 2.0;
    maxLife = 80 + Math.floor(Math.random() * 60);
  } else {
    // ambient: very slow drift upward
    vx = (Math.random() - 0.5) * 0.4;
    vy = -(0.15 + Math.random() * 0.45);
    size = 0.8 + Math.random() * 1.6;
    maxLife = 120 + Math.floor(Math.random() * 100);
  }

  return { x, y, vx, vy, size, life: maxLife, maxLife, r: c.r, g: c.g, b: c.b };
}

function burst(m, count) {
  for (let i = 0; i < count; i++) {
    if (particles.length < 140) particles.push(makeParticle(m));
  }
}

function seed() {
  // Scatter initial ambient particles across the full area so canvas isn't empty on load
  for (let i = 0; i < 20; i++) {
    const p = makeParticle("ambient");
    p.y = Math.random() * H;
    p.life = Math.floor(Math.random() * p.maxLife);
    particles.push(p);
  }
}

function tick() {
  ctx.clearRect(0, 0, W, H);

  // Continuous ambient trickle (paused during agitated — let burst dominate)
  if (mode !== "agitated") {
    const rate = mode === "calm" ? 0.18 : 0.06;
    if (Math.random() < rate && particles.length < 70) {
      particles.push(makeParticle(mode));
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;

    if (p.life <= 0 || p.y < -12 || p.x < -12 || p.x > W + 12) {
      particles.splice(i, 1);
      continue;
    }

    const t = p.life / p.maxLife;
    // Fade in over first 15% of life, out over last 40%
    const fadeIn  = Math.min(1, (1 - t) / 0.15 + 0.01);
    const fadeOut = t < 0.4 ? t / 0.4 : 1;
    const alpha   = Math.min(fadeIn, fadeOut) * 0.55;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha})`;
    ctx.fill();
  }

  requestAnimationFrame(tick);
}

self.onmessage = ({ data }) => {
  switch (data.type) {
    case "init":
      canvas = data.canvas;
      W = data.width;
      H = data.height;
      canvas.width  = W;
      canvas.height = H;
      ctx = canvas.getContext("2d");
      seed();
      tick();
      break;

    case "mode": {
      const prev = mode;
      mode = data.value;
      if (mode === "agitated") {
        burst("agitated", 14);
      } else if (mode === "calm" && prev === "agitated") {
        // Wash out the red with a calm green burst
        burst("calm", 8);
      }
      break;
    }

    case "resize":
      W = data.width;
      H = data.height;
      canvas.width  = W;
      canvas.height = H;
      break;
  }
};
