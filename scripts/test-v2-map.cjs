// Driftwood v2: the "dawn to night" garden map (ui/world.js). The sun (the
// moon, at night) stands over the next level's bed and shines on it, and after
// a level the sun travels to the new bed. Checks, at each size:
//   - next = Level 2 and next = Level 4: data-sun names that bed, and the sun's
//     x lies inside that bed's box;
//   - the travel (last seen at Level 3, now Level 4) runs, then ends on Level 4;
//   - every level done: dawn, no beam, the finished-garden button on screen;
//   - all five beds on screen with no scrolling; no long tasks over 200 ms.
// Run (the dev server must be up on :8766):
//   PLAYWRIGHT_MODULE=/Users/lucyliu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright \
//   CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
//   node scripts/test-v2-map.cjs
// Optional: BASE_URL (default http://127.0.0.1:8766/v2/).
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const BASE = process.env.BASE_URL || "http://127.0.0.1:8766/v2/";
const MUTE = fs.readFileSync(path.join(__dirname, "test-mute.js"), "utf8");
const SIZES = [
  { name: "mac", width: 1512, height: 830 },
  { name: "phone", width: 844, height: 390, touch: true },
  { name: "small", width: 568, height: 320, touch: true },
];
const FLAWS = ["Sycophancy", "Hallucination", "Reckless advice", "False memory", "Emotional manipulation"];
function progress(done) {
  const levels = {}, guide = [];
  for (let i = 0; i < done; i++) {
    levels[`level-${i + 1}`] = { stars: 3, fooled: false };
    guide.push({ levelId: `level-${i + 1}`, flaw: FLAWS[i], tip: "Ask for the downside.", fooled: false });
  }
  return JSON.stringify({ name: "Tester", levels, guide, introSeen: true });
}

async function openMap(page, done, seen) {
  await page.evaluate(([p, s]) => {
    localStorage.setItem("dw2_progress", p);
    if (s === null) localStorage.removeItem("dw2_map_time"); else localStorage.setItem("dw2_map_time", String(s));
  }, [progress(done), seen]);
  await page.goto(`${BASE}?screen=map`);
  await page.waitForSelector(".plots");
}

// The sun sits over `id`'s bed: named in data-sun, its x inside the bed box.
async function sunOn(page, id, label) {
  const s = await page.evaluate((id) => {
    const m = document.querySelector("main.map");
    const box = document.querySelector(`[data-level="${id}"] .plot__box`).getBoundingClientRect();
    const host = m.getBoundingClientRect();
    return { sun: m.dataset.sun, x: Number(m.dataset.sunX) + host.left, left: box.left, right: box.right, moving: "moving" in m.dataset };
  }, id);
  assert.equal(s.moving, false, `${label}: still travelling`);
  assert.equal(s.sun, id, `${label}: the sun is over ${s.sun}, not ${id}`);
  assert.ok(s.x >= s.left && s.x <= s.right, `${label}: sun x ${s.x} outside ${id}'s bed ${s.left}-${s.right}`);
}

async function allOnScreen(page, label) {
  const g = await page.evaluate(() => ({
    sy: document.documentElement.scrollHeight - innerHeight, sx: document.documentElement.scrollWidth - innerWidth,
    off: [...document.querySelectorAll(".plot")].filter((p) => {
      const r = p.getBoundingClientRect();
      return r.left < 0 || r.right > innerWidth || r.top < 0 || r.bottom > innerHeight;
    }).map((p) => p.dataset.level),
  }));
  assert.deepEqual(g, { sy: 0, sx: 0, off: [] }, `${label}: beds off screen or page scrolls`);
}

async function run(browser, size) {
  const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height }, hasTouch: !!size.touch, isMobile: !!size.touch });
  await ctx.addInitScript(MUTE);
  await ctx.addInitScript(() => {
    window.__longtasks = [];
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__longtasks.push(Math.round(e.duration)); }).observe({ type: "longtask", buffered: true }); } catch (_) {}
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(BASE);
  const long = [];
  const tasks = async () => long.push(...(await page.evaluate(() => window.__longtasks)).filter((d) => d > 200));

  for (const done of [1, 3]) {
    await openMap(page, done, done);
    const id = `level-${done + 1}`;
    await sunOn(page, id, `${size.name} next=${id}`);
    await allOnScreen(page, `${size.name} next=${id}`);
    assert.ok(await page.locator(`[data-level="${id}"].plot--next`).count(), `${size.name}: ${id} is not marked next`);
    await tasks();
  }

  // Travel: seen at Level 3 (time 2), now Level 4 is next (time 3).
  await openMap(page, 3, 2);
  assert.ok(await page.evaluate(() => "moving" in document.querySelector("main.map").dataset), `${size.name}: no travel after finishing a level`);
  // Mid-travel the lawn and path keep their colour (a bad blend once drew them black).
  await page.waitForTimeout(600);
  const ground = await page.evaluate(() => {
    const c = document.querySelector(".world__sky");
    const g = c.getContext("2d");
    return [0.86, 0.97].map((fy) => [...g.getImageData(Math.floor(c.width * 0.05), Math.floor(c.height * fy), 1, 1).data].slice(0, 3));
  });
  for (const px of ground) assert.ok(Math.max(...px) > 40, `${size.name}: ground drawn black mid-travel ${JSON.stringify(ground)}`);
  await page.waitForFunction(() => !("moving" in document.querySelector("main.map").dataset), null, { timeout: 4000 });
  await sunOn(page, "level-4", `${size.name} after travel`);
  assert.equal(await page.evaluate(() => localStorage.getItem("dw2_map_time")), "3", `${size.name}: travel not remembered`);
  await tasks();

  // Every level done: dawn, no bed lit, the finished garden waiting.
  await openMap(page, 5, 5);
  const dawn = await page.evaluate(() => ({ time: document.querySelector("main.map").dataset.time, sun: document.querySelector("main.map").dataset.sun ?? null }));
  assert.deepEqual(dawn, { time: "5", sun: null }, `${size.name}: all done is not dawn`);
  const btn = page.getByRole("button", { name: "Your finished garden →" });
  const r = await btn.boundingBox();
  assert.ok(r && r.y + r.height <= size.height && r.x + r.width <= size.width, `${size.name}: finished-garden button off screen`);
  await allOnScreen(page, `${size.name} all done`);
  await tasks();

  // Field guide: five cards in one row, nothing cut off, each found card with
  // its own level's tip (even if the saved tip is stale), the rest face down.
  const { pathToFileURL } = require("node:url");
  for (const done of [3, 5]) {
    await page.evaluate((p) => {
      const o = JSON.parse(p);
      o.guide.forEach((c) => { c.tip = "STALE TIP"; });
      localStorage.setItem("dw2_progress", JSON.stringify(o));
    }, progress(done));
    await page.goto(`${BASE}?screen=map`);
    await page.getByRole("button", { name: `Field guide ${done}/5` }).click();
    await page.waitForSelector(".guide .guide__row");
    await page.evaluate(() => document.fonts.ready);
    const g = await page.evaluate(() => {
      const cards = [...document.querySelectorAll(".guide__card")];
      const rs = cards.map((c) => c.getBoundingClientRect());
      return {
        n: cards.length,
        rowSpread: Math.max(...rs.map((r) => r.top)) - Math.min(...rs.map((r) => r.top)),
        h: rs[0].height,
        inside: rs.every((r) => r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight),
        clipped: cards.filter((c) => c.scrollHeight > c.clientHeight + 1).length,
        scroll: [document.documentElement.scrollWidth - innerWidth, document.documentElement.scrollHeight - innerHeight],
        tips: [...document.querySelectorAll(".gc__tip")].map((t) => t.textContent),
        backs: document.querySelectorAll(".guide__card--empty .gc__back").length,
        tipFont: getComputedStyle(document.querySelector(".gc__tip")).fontFamily,
        pixel: document.fonts.check("12px 'Pixelify Sans'"),
      };
    });
    const label = `${size.name} guide ${done}/5`;
    assert.equal(g.n, 5, `${label}: five cards`);
    assert.ok(g.rowSpread < g.h / 4, `${label}: cards are not in one row (${g.rowSpread}px apart)`);
    assert.ok(g.inside, `${label}: a card is off screen`);
    assert.equal(g.clipped, 0, `${label}: card text overflows`);
    assert.deepEqual(g.scroll, [0, 0], `${label}: page scrolls`);
    assert.equal(g.backs, 5 - done, `${label}: face-down cards`);
    assert.match(g.tipFont, /Pixelify Sans/, `${label}: tip font`);
    assert.ok(g.pixel, `${label}: pixel font not loaded`);
    for (let i = 0; i < done; i++) {
      const level = (await import(pathToFileURL(path.join(__dirname, "..", "v2", "levels", `level-${i + 1}.js`)).href)).default;
      assert.equal(g.tips[i], level.reveal.tip, `${label}: card ${i + 1} shows the wrong tip`);
    }
    await tasks();
  }

  assert.deepEqual(errors, [], `${size.name}: page errors`);
  await ctx.close();
  return long;
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ["--mute-audio"] });
  let failed = 0;
  for (const size of SIZES) {
    try {
      const long = await run(browser, size);
      console.log(`${long.length ? "FAIL" : "pass"}  map/dawn-sun ${size.name}  (long tasks: ${long.length ? long.join(", ") + " ms" : "none"})`);
      if (long.length) failed++;
    } catch (e) {
      failed++;
      console.log(`FAIL  map/dawn-sun ${size.name}\n   ${e.message.split("\n")[0]}`);
    }
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
