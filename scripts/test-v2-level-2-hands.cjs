// Level 2 (Luna's greenhouse) done by hand: every chore and every garden
// change is a real drag (mouse on a laptop, CDP touch on a phone) or a tap,
// with no auto-finish. Covers the wipe and mist kinds (Level 2's own), the
// basil plant-at-a-spot sequence, the pinch, the tea-jar chore, both mint
// endings (fooled: beside the basil; caught: fill a sill pot, set the plug,
// firm, mist), "my way" on both trust steps, and a skipped chore that leaves
// the garden bar alone. No JS errors, no long tasks over 200 ms.
// Screenshots go to docs/agent-playtest/2026-11-v2-level2-wave2/.
//
//   PLAYWRIGHT_MODULE=/Users/lucyliu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright \
//   CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
//   BASE_URL=http://127.0.0.1:8772/v2/ node scripts/test-v2-level-2-hands.cjs
//
// Optional: EVIDENCE_DIR, ONLY=<label substring>.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { completeAction, actionIdle, dragTo, skipChore } = require("./v2-actions-helper.cjs");

const BASE = process.env.BASE_URL || "http://127.0.0.1:8772/v2/";
const OUT = process.env.EVIDENCE_DIR || path.join(__dirname, "..", "docs", "agent-playtest", "2026-11-v2-level2-wave2");
const MUTE = fs.readFileSync(path.join(__dirname, "test-mute.js"), "utf8");
const LAPTOP = { name: "1512x830", width: 1512, height: 830 };
const PHONE = { name: "844x390", width: 844, height: 390, touch: true };
const LONGTASK_LIMIT_MS = 200;
const PROGRESS = JSON.stringify({ name: "Tester", levels: { "level-1": { stars: 3, fooled: false } }, guide: [] });

async function open(browser, size) {
  const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height }, hasTouch: !!size.touch });
  await ctx.addInitScript(MUTE);
  await ctx.addInitScript((p) => {
    window.__dwAutoAct = false; // every action by hand
    try {
      localStorage.setItem("dw2_progress", p);
      for (let i = 1; i <= 5; i++) localStorage.setItem(`dw2_almanac_hint_level-${i}`, "1");
    } catch (_) { /* fine */ }
    window.__longtasks = [];
    try {
      new PerformanceObserver((list) => { for (const e of list.getEntries()) window.__longtasks.push(Math.round(e.duration)); })
        .observe({ type: "longtask", buffered: true });
    } catch (_) { /* unsupported */ }
  }, PROGRESS);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(`${BASE}?screen=level&level=level-2`);
  await page.waitForSelector('main.level[data-scene="greenhouse"]');
  return { ctx, page, errors };
}

const shot = (page, size, label) => page.screenshot({ path: path.join(OUT, `${size.name}-${label}.png`) });
const press = async (page, size, locator) => { await locator.scrollIntoViewIfNeeded(); return size.touch ? locator.tap() : locator.click(); };
const btn = (page, name) => page.getByRole("button", { name, exact: true });
const meter = (page) => page.textContent(".meter__text");
const act = (page) => page.waitForSelector("main.level .act", { timeout: 8000 });
const actGone = (page) => page.waitForSelector("main.level .act", { state: "detached", timeout: 8000 });
const say = (page) => page.textContent("main.level .act__say");

// Drag the tool onto the first ring. The ring can be redrawn between
// frames, so a drop that found none is tried again.
async function dropTool(page, size) {
  for (let t = 0; ; t++) {
    try { return await dragTo(page, "main.level .act__item", "main.level .act__ring", { touch: !!size.touch }); } catch (err) {
      if (t > 10 || !/missing/.test(String(err))) throw err;
      await page.waitForTimeout(150);
    }
  }
}

// One unit by hand: tap the next spot, or drag the tool onto the first ring.
async function oneUnit(page, size) {
  await actionIdle(page, 8000);
  // Between two actions the card can sit for a beat with no target drawn yet.
  await page.waitForFunction(() => !document.querySelector("main.level .act")
    || document.querySelector("main.level .act__spot, main.level .act__ring"), null, { timeout: 5000 });
  if (!(await page.locator("main.level .act").count())) return;
  const spot = page.locator("main.level .act__spot").first();
  if (await spot.count()) {
    await (size.touch ? spot.tap() : spot.click());
  } else {
    await dropTool(page, size);
  }
  await page.waitForTimeout(80);
  await actionIdle(page, 8000).catch(() => {});
}

// Finish the open plan by hand; returns how many units it took.
async function byHand(page, size, { onUnit } = {}) {
  await act(page);
  let n = 0;
  while (await page.locator("main.level .act").count()) {
    assert.ok(n < 30, "the plan never finished");
    await oneUnit(page, size);
    n += 1;
    if (onUnit) await onUnit(n);
  }
  return n;
}

// Drop the tool, then shoot while the animation is still playing.
async function midShot(page, size, label, ms) {
  await actionIdle(page, 8000);
  await dropTool(page, size);
  await page.waitForTimeout(ms);
  await shot(page, size, label);
  await actionIdle(page, 8000).catch(() => {});
}

async function wipeGlass(page, size) {
  await act(page);
  assert.match(await say(page), /cloth over the foggy glass/);
  assert.equal(await page.locator("main.level .act [data-act-skip]").count(), 1, "chores keep their Skip");
  const before = await meter(page);
  await shot(page, size, "1-glass-fogged");
  await oneUnit(page, size);
  const o1 = Number(await page.$eval('[data-prop="glass"]', (e) => getComputedStyle(e).opacity));
  assert.ok(o1 > 0.5 && o1 < 0.8, `one wipe thins the fog (opacity ${o1})`);
  await midShot(page, size, "1-glass-wiping", 450);
  await byHand(page, size);
  assert.equal(await page.getAttribute('[data-prop="glass"]', "data-wiped"), "true");
  assert.equal(Number(await page.$eval('[data-prop="glass"]', (e) => getComputedStyle(e).opacity)), 0, "the glass is clear");
  assert.equal(await meter(page), before, "a chore never moves the garden bar");
}

async function basil(page, size, way) {
  await press(page, size, btn(page, "Where should the basil go?"));
  await page.waitForSelector('main.level[data-phase="advice"]');
  if (way === "mine") {
    await press(page, size, btn(page, "? Something's off"));
    await page.waitForSelector('.bubble__actions [data-choice="mine"]');
    await press(page, size, page.locator('.bubble__actions [data-choice="mine"]'));
  } else {
    await press(page, size, btn(page, "✓ Do it"));
  }
  await act(page);
  const spot = way === "mine" ? "cool end by the door" : "warm middle";
  for (let i = 0; i < 4; i++) {
    await act(page);
    assert.match(await say(page), new RegExp(spot), `step ${i + 1} points at the ${spot}`);
    assert.equal(await page.locator('[data-bed="bench"] [data-plant="basil"]').count(), 0, "the basil waits for the last action");
    if (i === 1) { await midShot(page, size, `2-basil-${way}-planting`, 600); continue; }
    await oneUnit(page, size);
  }
  await actGone(page).catch(() => {});
  await page.waitForSelector('[data-bed="bench"] [data-plant="basil"].plant--growing');
}

async function mistBasil(page, size) {
  await act(page);
  assert.match(await say(page), /Mist the new basil/);
  await midShot(page, size, "3-mist-basil", 700);
  await actGone(page);
}

async function pinch(page, size, way) {
  await press(page, size, btn(page, "How do I get more basil leaves?"));
  await page.waitForSelector('main.level[data-phase="advice"]');
  if (way === "mine") {
    await press(page, size, btn(page, "? Something's off"));
    await page.waitForSelector('.bubble__actions [data-choice="mine"]');
    await press(page, size, page.locator('.bubble__actions [data-choice="mine"]'));
    assert.match(await (await act(page)).textContent(), /watering can/i);
    await byHand(page, size);
    return;
  }
  await press(page, size, btn(page, "✓ Do it"));
  await act(page);
  assert.equal(await page.locator("main.level .act__spot").count(), 4, "4 tips to pinch");
  await page.waitForTimeout(400);
  await shot(page, size, "4-pinch-tips");
  for (let i = 0; i < 4; i++) await oneUnit(page, size);
  await page.waitForSelector('[data-bed="bench"] [data-plant="basil"].plant--thriving');
}

async function teaJar(page, size, { skip = false } = {}) {
  await act(page);
  assert.match(await say(page), /tea jar/);
  const before = await meter(page);
  if (skip) {
    await skipChore(page);
  } else {
    assert.equal(await byHand(page, size), 3, "3 tips into the jar");
  }
  assert.match(await page.getAttribute('[data-prop="jar"]', "src"), /l2-jar\.svg/, "the jar shows full");
  assert.equal(await meter(page), before, "the jar never moves the garden bar");
  if (!skip) await shot(page, size, "5-jar-full");
}

async function setup(browser, size, { basilWay = "doIt", pinchWay = "doIt", skipJar = false } = {}) {
  const run = await open(browser, size);
  const { page } = run;
  await wipeGlass(page, size);
  await basil(page, size, basilWay);
  await mistBasil(page, size);
  await pinch(page, size, pinchWay);
  await teaJar(page, size, { skip: skipJar });
  await press(page, size, btn(page, "Where should the mint go?"));
  await page.waitForSelector('main.level[data-phase="advice"] .bubble--glitch');
  assert.equal(await page.locator('[data-prop="pot-1"][src*="l2-pot-empty"]').count(), 1, "no hint: the sill pots are still empty at the drift");
  return run;
}

async function finish(run, label) {
  const { ctx, page, errors } = run;
  const long = (await page.evaluate(() => window.__longtasks)).filter((t) => t > LONGTASK_LIMIT_MS);
  await ctx.close();
  assert.deepEqual(errors, [], `${label}: JS errors`);
  assert.deepEqual(long, [], `${label}: long tasks`);
}

async function fooled(browser, size) {
  const run = await setup(browser, size);
  const { page } = run;
  await shot(page, size, "6-drift");
  await press(page, size, btn(page, "✓ Do it"));
  await act(page);
  assert.match(await say(page), /spot right beside the basil/, "the director points exactly where Luna said");
  await byHand(page, size);
  await page.waitForSelector('[data-bed="bench"] [data-plant="mint"].plant--overrun');
  await page.waitForSelector(".level-end .btn");
  await shot(page, size, "7-fooled-outcome");
  await finish(run, `${size.name} fooled`);
}

async function caught(browser, size) {
  const run = await setup(browser, size);
  const { page } = run;
  await press(page, size, btn(page, "? Something's off"));
  await press(page, size, btn(page, "It said something false as if it were a fact"));
  await press(page, size, btn(page, "If you're not sure, say so. Don't make up facts."));
  await page.waitForSelector('main.level[data-phase="reanswer"]');
  await press(page, size, btn(page, "✓ Do it"));
  await act(page);
  assert.match(await say(page), /compost bag to the first pot/);
  await midShot(page, size, "6-caught-fill-pot", 500);
  assert.match(await page.getAttribute('[data-prop="pot-1"]', "src"), /l2-pot-soil/, "the pot is full of compost");
  await act(page);
  assert.match(await say(page), /mint plug/);
  await oneUnit(page, size);
  await oneUnit(page, size); // firm
  await act(page);
  await midShot(page, size, "7-caught-mist-pot", 700);
  await page.waitForSelector('[data-bed="sill"] [data-plant="mint"].plant--thriving');
  assert.equal(await page.locator('[data-bed="bench"] [data-plant="mint"]').count(), 0, "no mint in the bed");
  await page.waitForSelector(".level-end .btn");
  await shot(page, size, "8-caught-outcome");
  await finish(run, `${size.name} caught`);
}

// My way on both trust steps, by keyboard, with the jar chore skipped.
async function mineKeyboard(browser, size) {
  const run = await open(browser, size);
  const { page } = run;
  await act(page);
  await completeAction(page);
  await press(page, size, btn(page, "Where should the basil go?"));
  await press(page, size, btn(page, "? Something's off"));
  await press(page, size, page.locator('.bubble__actions [data-choice="mine"]'));
  await act(page);
  assert.match(await say(page), /cool end by the door/);
  await completeAction(page);
  await page.waitForSelector('[data-bed="bench"] [data-plant="basil"]');
  await completeAction(page).catch(() => {}); // the mist chore, if completeAction hasn't already run straight on into it
  await press(page, size, btn(page, "How do I get more basil leaves?"));
  await press(page, size, btn(page, "? Something's off"));
  await press(page, size, page.locator('.bubble__actions [data-choice="mine"]'));
  await act(page);
  assert.match(await say(page), /watering can/);
  await page.locator("main.level .act__item").focus();
  await page.keyboard.press("Enter"); // one Enter waters the basil
  await page.waitForSelector('main.level .act__say:has-text("tea jar")', { timeout: 8000 });
  await teaJar(page, size, { skip: true });
  await shot(page, size, "9-mine-both");
  await finish(run, `${size.name} mine`);
}

const RUNS = [
  ["laptop/fooled", fooled, LAPTOP],
  ["phone/fooled", fooled, PHONE],
  ["laptop/caught", caught, LAPTOP],
  ["phone/caught", caught, PHONE],
  ["laptop/mine-keyboard", mineKeyboard, LAPTOP],
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ["--mute-audio"] });
  let failed = 0;
  for (const [label, fn, size] of RUNS) {
    if (process.env.ONLY && !label.includes(process.env.ONLY)) continue;
    try { await fn(browser, size); console.log(`pass  ${label}`); } catch (err) { failed += 1; console.log(`FAIL  ${label}\n${String(err.stack || err).split("\n").slice(0, 6).join("\n")}`); }
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
