// Level 3 hands-on (wave 2): every action done by hand, at laptop size with
// a mouse and at phone size with real touch drags.
//   chore weeds (tap ×4) → aphids Do it: hose ×3, hose ×2, ladybug jar →
//   chore tie (twine) → blueberries Do it: pick the 4 ripe → chore net →
//   wildberries caught: magnifier, camera, "Don't eat" tag → reveal.
// Plus a "my way" run (bug spray, pick them now) and a fooled run, where
// nothing is acted out by hand. Screenshots, including mid-jet frames of the
// hose, go to docs/agent-playtest/2026-11-v2-level3-wave2/.
//
//   PLAYWRIGHT_MODULE=… CHROME_PATH=… BASE_URL=http://127.0.0.1:8773/v2/ \
//   node scripts/test-v2-level3-actions.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { actionIdle, dragTo } = require("./v2-actions-helper.cjs");

const BASE = process.env.BASE_URL || "http://127.0.0.1:8773/v2/";
const OUT = process.env.EVIDENCE_DIR || path.join(__dirname, "..", "docs", "agent-playtest", "2026-11-v2-level3-wave2");
const MUTE = fs.readFileSync(path.join(__dirname, "test-mute.js"), "utf8");
const MAC = { name: "1512x830", width: 1512, height: 830 };
const PHONE = { name: "844x390", width: 844, height: 390, touch: true };
const PROGRESS = JSON.stringify({
  name: "Tester",
  levels: { "level-1": { stars: 3, fooled: false }, "level-2": { stars: 3, fooled: false } },
  guide: [],
});

async function open(browser, size) {
  const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height }, hasTouch: !!size.touch });
  await ctx.addInitScript(MUTE);
  await ctx.addInitScript((p) => {
    window.__dwAutoAct = false;
    try {
      localStorage.setItem("dw2_progress", p);
      for (let i = 1; i <= 5; i++) localStorage.setItem(`dw2_almanac_hint_level-${i}`, "1");
    } catch (_) { /* fine */ }
    window.__longtasks = [];
    try {
      new PerformanceObserver((list) => { for (const e of list.getEntries()) window.__longtasks.push(Math.round(e.duration)); })
        .observe({ type: "longtask", buffered: true });
    } catch (_) { /* fine */ }
  }, PROGRESS);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(`${BASE}?screen=level&level=level-3`);
  return { ctx, page, errors };
}

const shot = (page, size, name) => page.screenshot({ path: path.join(OUT, `${size.name}-${name}.png`) });
const press = (page, size, loc) => (size.touch ? loc.first().tap() : loc.first().click());
const card = (page, kind) => page.waitForSelector(`main.level .act[data-kind="${kind}"]`, { timeout: 8000 });
// The card for `kind` has closed (a chore's card can open straight after it).
const gone = (page, kind) => page.waitForFunction((k) => {
  const a = document.querySelector("main.level .act");
  return !a || a.dataset.kind !== k;
}, kind, { timeout: 10000 });
const FIELD = (bed) => `[data-bed="${bed}"]`;

// Drag the tool onto a target `times` times; optionally screenshot mid-animation.
async function drag(page, size, kind, to, times = 1, snap = null) {
  for (let i = 0; i < times; i++) {
    await card(page, kind);
    await actionIdle(page);
    await dragTo(page, "main.level .act__item", to, { touch: !!size.touch });
    if (snap && i === 0) { await page.waitForTimeout(snap.ms); await shot(page, size, snap.name); }
    await actionIdle(page, 8000);
  }
}
async function tapSpots(page, size, kind, n, snapName = null) {
  await card(page, kind);
  if (snapName) await shot(page, size, snapName);
  for (let i = 0; i < n; i++) {
    await actionIdle(page);
    await press(page, size, page.locator("main.level .act__spot"));
    await page.waitForTimeout(40);
  }
  await actionIdle(page, 8000);
}
const chip = (page, size, re) => press(page, size, page.locator("main.level .chip").filter({ hasText: re }));
const doIt = (page, size) => press(page, size, page.getByRole("button", { name: "✓ Do it" }));

async function aphidsAndBerries(page, size, { mine = false } = {}) {
  // Chore 1: weeds.
  await card(page, "pull");
  assert.match(await page.textContent(".act__title"), /Chore/);
  await tapSpots(page, size, "pull", 4, "1-chore-weeds");
  await gone(page, "pull");

  await chip(page, size, /Tiny green bugs/);
  if (!mine) {
    await doIt(page, size);
    await card(page, "spray");
    assert.equal(await page.locator(`${FIELD("row", "bean")} .plant--aphids, [data-bed="row"] [data-plant="bean"].plant--aphids`).count() > 0, true, "aphids still there before the hose");
    await shot(page, size, "2a-hose-ready");
    await drag(page, size, "spray", FIELD("row", "bean"), 3, { ms: 760, name: "2b-hose-jet" });
    await drag(page, size, "spray", FIELD("row", "bean"), 2, { ms: 700, name: "2c-hose-wash" });
    await drag(page, size, "release", FIELD("row", "bean"), 1, { ms: 900, name: "2d-ladybugs-out" });
    await gone(page, "release");
    await page.waitForSelector('[data-bed="row"] [data-plant="bean"].plant--thriving');
    assert.equal(await page.locator(".act-marks .l3-ladies").count(), 1, "the ladybugs stay on the beans");
    await shot(page, size, "2e-beans-clean");
  } else {
    await press(page, size, page.getByRole("button", { name: "? Something's off" }));
    await press(page, size, page.getByRole("button", { name: "Spray it anyway" }));
    await drag(page, size, "spray", FIELD("row", "bean"), 3, { ms: 560, name: "m2-bug-spray-mist" });
    await gone(page, "spray");
    await shot(page, size, "m2-after-spray");
  }

  // Chore 2: tie the beans.
  await drag(page, size, "poke", FIELD("row", "bean"));
  await gone(page, "poke");

  await chip(page, size, /blueberries ripe/);
  if (!mine) {
    await doIt(page, size);
    await tapSpots(page, size, "pick", 4, "3a-pick-ripe");
  } else {
    await press(page, size, page.getByRole("button", { name: "? Something's off" }));
    await press(page, size, page.getByRole("button", { name: "Pick them now" }));
    await tapSpots(page, size, "pick", 4, "m3-pick-unripe");
  }
  await gone(page, "pick");

  // Chore 3: net the tub.
  await drag(page, size, "cover", FIELD("tub", "blueberry"));
  await gone(page, "cover");
  assert.equal(await page.locator(".act-marks .act-mark--cover").count(), 1, "the net stays over the tub");
  await shot(page, size, "4-net-on");
}

async function caught(browser, size) {
  const { ctx, page, errors } = await open(browser, size);
  const t0 = Date.now();
  await aphidsAndBerries(page, size);
  await chip(page, size, /dark berries/);
  await press(page, size, page.getByRole("button", { name: "? Something's off" }));
  await press(page, size, page.getByRole("button", { name: "It made something risky sound safe" }));
  await press(page, size, page.getByRole("button", { name: "For anything about my health or safety, tell me to ask a real expert" }));
  await doIt(page, size);
  await drag(page, size, "magnifier", FIELD("hedge", "wildberry"), 1, { ms: 1200, name: "5a-lens" });
  await drag(page, size, "photo", FIELD("hedge", "wildberry"), 1, { ms: 640, name: "5b-photo" });
  await drag(page, size, "label", FIELD("hedge", "wildberry"));
  await page.waitForSelector('[data-bed="hedge"] [data-plant="wildberry"].plant--tagged');
  assert.equal(await page.locator(".act-marks .l3-polaroid").count(), 1, "the photo stays by the hedge");
  await shot(page, size, "5c-tagged");
  await page.getByRole("button", { name: "See what happened →" }).waitFor();
  const ms = Date.now() - t0;
  const result = { errors, longtasks: await page.evaluate(() => window.__longtasks), ms };
  await ctx.close();
  return result;
}

async function mine(browser, size) {
  const { ctx, page, errors } = await open(browser, size);
  await aphidsAndBerries(page, size, { mine: true });
  const result = { errors, longtasks: await page.evaluate(() => window.__longtasks) };
  await ctx.close();
  return result;
}

// Fooled: Do it on the wild berries acts nothing out (no picking or eating by hand).
async function fooled(browser, size) {
  const { ctx, page, errors } = await open(browser, size);
  // Every chore can be skipped; skipping touches nothing.
  const { skipChore } = require("./v2-actions-helper.cjs");
  await card(page, "pull");
  const before = await page.textContent(".meter__text");
  await skipChore(page);
  assert.equal(await page.textContent(".meter__text"), before, "skipping a chore leaves the garden bar alone");
  await page.evaluate(() => { window.__dwAutoAct = true; });
  await page.waitForSelector("main.level .chip");
  await chip(page, size, /Tiny green bugs/);
  await doIt(page, size);
  await chip(page, size, /blueberries ripe/);
  await doIt(page, size);
  await page.evaluate(() => { window.__dwAutoAct = false; });
  await chip(page, size, /dark berries/);
  await doIt(page, size);
  await page.getByRole("button", { name: "See what happened →" }).waitFor({ timeout: 8000 });
  assert.equal(await page.locator("main.level .act").count(), 0, "no hands-on action when fooled");
  const result = { errors, longtasks: await page.evaluate(() => window.__longtasks) };
  await ctx.close();
  return result;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ["--mute-audio"] });
  const runs = [];
  for (const size of [MAC, PHONE]) runs.push([`${size.name}/caught`, size, caught], [`${size.name}/mine`, size, mine], [`${size.name}/fooled`, size, fooled]);
  const only = (process.env.ONLY || "").split(",").filter(Boolean);
  let failed = 0;
  for (const [label, size, fn] of runs) {
    if (only.length && !only.some((o) => label.includes(o))) continue;
    try {
      const r = await fn(browser, size);
      const long = (r.longtasks || []).filter((d) => d > 200);
      assert.deepEqual(r.errors, [], `${label}: no JS errors`);
      assert.deepEqual(long, [], `${label}: no long tasks over 200 ms`);
      console.log(`pass  ${label}${r.ms ? `  (${Math.round(r.ms / 1000)} s of scripted play)` : ""}`);
    } catch (err) {
      failed += 1;
      console.log(`FAIL  ${label}\n${String(err.stack || err).split("\n").slice(0, 6).join("\n")}`);
    }
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
