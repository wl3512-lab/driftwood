#!/usr/bin/env node
// Renders Driftwood v2's audio stems for the trailer into docs/trailer/audio/:
// the 65 s music bed, the five drift motifs on the same timeline, both
// reveal stings, every sound effect (pet stingers once per pet) and one line
// per speaker's voice. Then checks every WAV for clipping, peaks and silence.
//
// Nothing plays aloud: the page runs scripts/test-mute.js, Chrome is launched
// with --mute-audio, and everything renders through OfflineAudioContext
// (computed into memory). Serve the repo first:
//   python3 -m http.server 8781 --bind 127.0.0.1
//   PLAYWRIGHT_MODULE=…/node_modules/playwright CHROME_PATH=… BASE_URL=http://127.0.0.1:8781/v2/ \
//     node scripts/render-trailer-audio.cjs [--check-only]
const fs = require("fs");
const path = require("path");
const OUT = path.join(__dirname, "..", "docs", "trailer", "audio");
const checkOnly = process.argv.includes("--check-only");

// ---- WAV check: peak, clipped samples, RMS, DC offset, length ----
function analyse(file) {
  const b = fs.readFileSync(file);
  const ch = b.readUInt16LE(22), rate = b.readUInt32LE(24), bits = b.readUInt16LE(34);
  if (b.toString("ascii", 0, 4) !== "RIFF" || bits !== 16) throw new Error(`${file}: not 16-bit PCM WAV`);
  const data = b.indexOf("data", 12);
  const len = b.readUInt32LE(data + 4);
  const n = len / 2;
  let peak = 0, clip = 0, sum = 0, sq = 0;
  for (let i = 0; i < n; i++) {
    const s = b.readInt16LE(data + 8 + i * 2) / 32768;
    const a = Math.abs(s);
    if (a > peak) peak = a;
    if (a >= 0.9999) clip += 1;
    sum += s; sq += s * s;
  }
  const db = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
  return { file: path.relative(OUT, file), ch, rate, seconds: n / ch / rate, peakDb: db(peak), rmsDb: db(Math.sqrt(sq / n)), dc: sum / n, clip };
}
function check() {
  const files = [];
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith(".wav") && files.push(path.join(d, e.name))));
  walk(OUT);
  const rows = files.sort().map(analyse);
  const bad = rows.filter((r) => r.clip > 0 || r.peakDb > -0.5 || r.peakDb < -12 || Math.abs(r.dc) > 0.01 || r.seconds < 0.02 || r.rmsDb < -45);
  for (const r of rows) console.log(`${r.file.padEnd(44)} ${r.seconds.toFixed(2).padStart(6)}s  peak ${r.peakDb.toFixed(1).padStart(5)} dB  rms ${r.rmsDb.toFixed(1).padStart(6)} dB  dc ${r.dc.toFixed(4)}  clipped ${r.clip}`);
  console.log(`\n${rows.length} WAVs, ${bad.length} flagged${bad.length ? `: ${bad.map((r) => r.file).join(", ")}` : ""}`);
  return bad.length === 0;
}

async function render() {
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
  const BASE = process.env.BASE_URL || "http://127.0.0.1:8781/v2/";
  const MUTE = fs.readFileSync(path.join(__dirname, "test-mute.js"), "utf8");
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ["--mute-audio", "--autoplay-policy=user-gesture-required"] });
  const page = await (await browser.newContext()).newPage();
  await page.addInitScript(MUTE);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${BASE}audio/board.html`);
  await page.waitForSelector("#board table");
  fs.mkdirSync(OUT, { recursive: true });
  for (const d of ["sfx", "voices", "stings"]) {
    const dir = path.join(OUT, d);
    fs.mkdirSync(dir, { recursive: true });
    for (const f of fs.readdirSync(dir)) if (f.endsWith(".wav")) fs.unlinkSync(path.join(dir, f));
  }
  // The job list comes from the page's own tables.
  const jobs = await page.evaluate(async () => {
    const { SFX } = await import(new URL("./sounds.js", location.href));
    const { STINGS } = await import(new URL("./music.js", location.href));
    const { VOICES } = await import(new URL("./voices.js", location.href));
    const { LEVELS } = await import(new URL("../levels/index.js", location.href));
    const { HANDOFFS } = await import(new URL("../levels/wizard.js", location.href));
    const pets = ["mango", "luna", "ember", "biscuit", "bugs"];
    const lines = { ...Object.fromEntries(Object.values(LEVELS).map((l) => [l.helper.id, l.greeting.replace(/\{name\}/g, "friend")])), rowan: HANDOFFS["level-1"].line };
    const list = [
      { kind: "bed", file: "trailer-bed.wav" },
      { kind: "drifts", file: "trailer-drift-hits.wav" },
      ...Object.keys(STINGS).map((n) => ({ kind: "sting", name: n, file: `stings/sting-${n}.wav` })),
      ...Object.keys(VOICES).map((id) => ({ kind: "voice", id, text: lines[id] || "Hello there.", file: `voices/voice-${id}.wav` })),
    ];
    for (const [n, d] of Object.entries(SFX)) {
      if (d.group === "pet") pets.forEach((p) => list.push({ kind: "sfx", name: n, opts: { pet: p }, file: `sfx/${n}-${p}.wav` }));
      else if (n === "star" || n === "bowl") [0, 1, 2, ...(n === "bowl" ? [3, 4] : [])].forEach((i) => list.push({ kind: "sfx", name: n, opts: { i }, file: `sfx/${n}-${i + 1}.wav` }));
      else list.push({ kind: "sfx", name: n, opts: {}, file: `sfx/${n}.wav` });
    }
    return list;
  });
  let i = 0;
  for (const job of jobs) {
    const b64 = await page.evaluate(async (j) => {
      const R = await import(new URL("./render.js", location.href));
      const chs = j.kind === "bed" ? await R.renderTrailerBed()
        : j.kind === "drifts" ? await R.renderTrailerDrifts()
        : j.kind === "sting" ? await R.renderSting(j.name)
        : j.kind === "voice" ? await R.renderVoice(j.id, j.text, { maxS: 4 })
        : await R.renderSfx(j.name, j.opts);
      const bytes = R.wav(chs, R.RATE);
      let s = "";
      for (let k = 0; k < bytes.length; k += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(k, k + 0x8000));
      return btoa(s);
    }, job);
    fs.writeFileSync(path.join(OUT, job.file), Buffer.from(b64, "base64"));
    i += 1;
    if (i % 20 === 0) console.log(`rendered ${i}/${jobs.length}`);
  }
  await browser.close();
  if (errors.length) throw new Error(`page errors: ${errors.join("; ")}`);
  console.log(`rendered ${jobs.length} files into ${OUT}`);
}

(async () => {
  if (!checkOnly) await render();
  process.exitCode = check() ? 0 : 1;
})().catch((e) => { console.error(e); process.exitCode = 1; });
