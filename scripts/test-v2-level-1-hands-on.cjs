// Level 1 (Mango) hands-on wave 2: every garden change is done by hand.
// Runs, each at laptop 1512x830 and phone 844x390:
//   full    trust path + caught drift, every action by keyboard, 3 stars
//   fooled  trust path + Do it on the drift, 1 star
//   mine    "my way" on both trust steps, harvest chore skipped, caught drift
// Screenshots go to docs/agent-playtest/2026-11-v2-level1-wave2/, including
// the watering stream mid-pour and a real mouse/touch drag of the can.
//
//   BASE_URL=http://127.0.0.1:8771/v2/ \
//   PLAYWRIGHT_MODULE=/Users/lucyliu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright \
//   CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
//   node scripts/test-v2-level-1-hands-on.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { completeAction, actionIdle, skipChore, tapOn } = require("./v2-actions-helper.cjs");

const BASE = process.env.BASE_URL || "http://127.0.0.1:8771/v2/";
const OUT = process.env.EVIDENCE_DIR || path.join(__dirname, "..", "docs", "agent-playtest", "2026-11-v2-level1-wave2");
const MUTE = fs.readFileSync(path.join(__dirname, "test-mute.js"), "utf8");
const SIZES = [
  { name: "1512x830", width: 1512, height: 830 },
  { name: "844x390", width: 844, height: 390, touch: true },
];
const PROGRESS = JSON.stringify({ name: "Tester", levels: {}, guide: [] });

async function open(browser, size) {
  const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height }, hasTouch: !!size.touch });
  await ctx.addInitScript(MUTE);
  await ctx.addInitScript((p) => {
    window.__dwAutoAct = false;
    try {
      localStorage.setItem("dw2_progress", p);
      localStorage.setItem("dw2_almanac_hint_level-1", "1");
    } catch (_) { /* fine */ }
  }, PROGRESS);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(`${BASE}?screen=level&level=level-1`);
  return { ctx, page, errors };
}

const shot = (page, size, name) => page.screenshot({ path: path.join(OUT, `${size.name}-${name}.png`) });
const press = (page, size, loc) => (size.touch ? loc.tap() : loc.click());
const btn = (page, name) => page.getByRole("button", { name, exact: true });
const kind = (page) => page.locator("main.level .act").getAttribute("data-kind");
const say = (page) => page.locator(".act__say").textContent();

// Do every action in the open plan by keyboard, recording the kinds and lines.
// Stops when this card goes, even if the next chore's card opens straight after.
let seq = 0;
async function doAll(page, log) {
  await page.waitForSelector("main.level .act", { timeout: 8000 });
  const tag = String(++seq);
  await page.evaluate((t) => { document.querySelector("main.level .act").dataset.hrun = t; }, tag);
  while (await page.locator(`main.level .act[data-hrun="${tag}"]`).count()) {
    await actionIdle(page);
    if (!(await page.locator("main.level .act__item").count())) break;
    log.push(`${await kind(page)}: ${(await say(page)).trim()}`);
    await page.locator("main.level .act__item").focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(60);
    await actionIdle(page).catch(() => {});
  }
}

async function ask(page, size, chip) {
  await page.waitForSelector("main.level .chip", { timeout: 10000 });
  await press(page, size, btn(page, chip));
  await page.waitForSelector('main.level[data-phase="advice"]');
}

async function stars(page, size) {
  const see = btn(page, "See what happened →");
  await see.waitFor({ timeout: 10000 });
  await press(page, size, see);
  await page.waitForSelector(".reveal", { timeout: 5000 });
  return page.getAttribute(".reveal__stars", "aria-label");
}

async function trustSteps(page, size, log, { evidence = false } = {}) {
  // Chore at the start: stones out of the South bed.
  await page.waitForSelector('main.level .act[data-kind="pull"]', { timeout: 10000 });
  if (evidence) await shot(page, size, "1-chore-stones");
  await doAll(page, log);
  await ask(page, size, "Where should the sunflowers go?");
  await press(page, size, btn(page, "✓ Do it"));
  await page.waitForSelector('main.level .act[data-kind="dig"]');
  assert.match(await say(page), /Dig 2 holes in the South bed/);
  if (evidence) await shot(page, size, "2-dig");
  await doAll(page, log);
  await page.waitForSelector('[data-bed="south"] [data-field="sunflower"]');
  if (evidence) await shot(page, size, "3-sunflowers-staked");
  // Weeds chore, then water.
  await page.waitForSelector('main.level .act[data-kind="pull"]');
  await doAll(page, log);
  await ask(page, size, "How often do I water?");
  await press(page, size, btn(page, "✓ Do it"));
  await page.waitForSelector('main.level .act[data-kind="hold"]');
  assert.match(await say(page), /Finger test/);
  await doAll(page, log); // finger test, then the barrel, then the water
}


// The early slip (before the harvest chore): Mango cheers lettuce in the South
// bed. "catch" flags it, names it and fixes it (no hands-on job after the fix);
// "follow" takes it and plants the lettuce by hand.
async function lettuceSlip(page, size, log, how) {
  await ask(page, size, "More lettuce in the South bed, full sun for everyone?");
  if (how === "follow") {
    await press(page, size, btn(page, "✓ Do it"));
    await page.waitForSelector('main.level .act[data-kind="dig"]');
    assert.match(await say(page), /South bed/);
    await doAll(page, log);
    await page.waitForSelector('[data-bed="south"] [data-plant="lettuce"].plant--bolted');
    return;
  }
  await press(page, size, btn(page, "? Something's off"));
  await press(page, size, btn(page, "It hyped my idea without checking it"));
  await press(page, size, btn(page, "Check my plan against the seed packet"));
  await page.waitForSelector('main.level[data-phase="reanswer"]');
  await press(page, size, btn(page, "✓ Do it"));
}

async function full(browser, size) {
  const { ctx, page, errors } = await open(browser, size);
  const log = [];
  await page.waitForSelector('main.level .act[data-kind="pull"]', { timeout: 10000 });
  await shot(page, size, "1-chore-stones");
  await doAll(page, log);
  await ask(page, size, "Where should the sunflowers go?");
  await press(page, size, btn(page, "✓ Do it"));
  await page.waitForSelector('main.level .act[data-kind="dig"]');
  assert.match(await say(page), /Dig 2 holes in the South bed/);
  await shot(page, size, "2-dig");
  await doAll(page, log);
  await page.waitForSelector('[data-bed="south"] [data-field="sunflower"]');
  await page.waitForTimeout(900);
  await shot(page, size, "3-sunflowers-staked");
  await page.waitForSelector('main.level .act[data-kind="pull"]');
  await shot(page, size, "4-chore-weeds");
  await doAll(page, log);
  await ask(page, size, "How often do I water?");
  await press(page, size, btn(page, "✓ Do it"));
  await page.waitForSelector('main.level .act[data-kind="hold"]');
  assert.match(await say(page), /Finger test/);
  await shot(page, size, "5-finger-test");
  // Finger test and barrel by keyboard (hold kinds), with the readouts.
  for (let i = 0; i < 2; i++) {
    await actionIdle(page);
    log.push(`${await kind(page)}: ${(await say(page)).trim()}`);
    await page.locator("main.level .act__item").focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(400);
    await actionIdle(page).catch(() => {});
  }
  await page.waitForSelector('main.level .act[data-kind="water"]');
  await shot(page, size, "6-barrel-filled");
  // The water itself by tapping each bed, screenshot mid-pour.
  log.push(`water: ${(await say(page)).trim()}`);
  assert.equal(await page.locator("main.level .act").getAttribute("data-mode"), "tap-target", "watering is a tap on the bed");
  assert.match(await page.locator("main.level .act__how").textContent(), /^Tap each one · or press Enter$/);
  await tapOn(page, '[data-bed="south"]', { touch: !!size.touch });
  await page.waitForTimeout(120); // mid-pour: chores are quick (v2/actions/fx.js PACE)
  await shot(page, size, "7-water-stream");
  await actionIdle(page);
  await tapOn(page, '[data-bed="east"]', { touch: !!size.touch });
  // The finger test's "Top inch: dry" sits on the East bed: it fades while the stream pours.
  await page.waitForSelector("main.level .act-layer .l3-jet", { timeout: 4000 });
  await page.waitForTimeout(60);
  const crossed = await page.evaluate(() => {
    const jets = [...document.querySelectorAll("main.level .act-layer .l3-jet")].map((j) => j.getBoundingClientRect());
    return [...document.querySelectorAll("main.level .act-mark--text")].filter((m) => {
      const r = m.getBoundingClientRect();
      const over = jets.some((b) => r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top);
      return over && Number(getComputedStyle(m).opacity) > 0.1;
    }).map((m) => m.textContent);
  });
  assert.deepEqual(crossed, [], "no result label shows through the water stream");
  await shot(page, size, "7b-water-east");
  await page.waitForSelector('main.level .act[data-kind="water"]', { state: "detached", timeout: 8000 });
  // The early lettuce slip caught, then the harvest chore, then the tomatoes caught and fixed.
  await lettuceSlip(page, size, log, "catch");
  await page.waitForSelector('main.level .act[data-kind="pick"]');
  await shot(page, size, "8-chore-harvest");
  await doAll(page, log);
  await ask(page, size, "Tomatoes in the shady corner, good idea?");
  await press(page, size, btn(page, "? Something's off"));
  await press(page, size, btn(page, "It hyped my idea without checking it"));
  await press(page, size, btn(page, "Tell me honestly if my idea is bad"));
  await page.waitForSelector('main.level[data-phase="reanswer"]');
  await press(page, size, btn(page, "✓ Do it"));
  await page.waitForSelector('main.level .act[data-kind="dig"]');
  await doAll(page, log);
  await page.waitForSelector('[data-bed="south"] [data-plant="tomato"].plant--thriving');
  await page.waitForTimeout(900);
  await shot(page, size, "9-tomatoes-south");
  assert.equal(await stars(page, size), "3 of 3 stars");
  await shot(page, size, "10-reveal-caught");
  await ctx.close();
  return { errors, log };
}

async function fooled(browser, size) {
  const { ctx, page, errors } = await open(browser, size);
  const log = [];
  await trustSteps(page, size, log);
  await lettuceSlip(page, size, log, "follow");
  await page.waitForSelector('main.level .act[data-kind="pick"]');
  await doAll(page, log);
  await ask(page, size, "Tomatoes in the shady corner, good idea?");
  await press(page, size, btn(page, "✓ Do it"));
  await page.waitForSelector('main.level .act[data-kind="dig"]');
  assert.match(await say(page), /Shady corner/);
  await doAll(page, log);
  await page.waitForSelector('[data-bed="corner"] [data-plant="tomato"].plant--damaged');
  await shot(page, size, "11-fooled-corner");
  assert.equal(await stars(page, size), "1 of 3 stars");
  await ctx.close();
  return { errors, log };
}

async function mine(browser, size) {
  const { ctx, page, errors } = await open(browser, size);
  const log = [];
  await page.waitForSelector('main.level .act[data-kind="pull"]', { timeout: 10000 });
  await doAll(page, log);
  await ask(page, size, "Where should the sunflowers go?");
  await press(page, size, btn(page, "? Something's off"));
  await press(page, size, btn(page, "Shady corner anyway"));
  await page.waitForSelector('main.level .act[data-kind="dig"]');
  assert.match(await say(page), /Shady corner/);
  await doAll(page, log);
  await page.waitForSelector('[data-bed="corner"] [data-plant="sunflower"].plant--leggy');
  await page.waitForSelector('main.level .act[data-kind="pull"]');
  await doAll(page, log);
  await ask(page, size, "How often do I water?");
  await press(page, size, btn(page, "? Something's off"));
  await press(page, size, btn(page, "Water every day anyway"));
  await page.waitForSelector('main.level .act[data-kind="hold"]');
  assert.match(await say(page), /rain barrel/);
  await doAll(page, log);
  await page.waitForSelector('[data-bed="east"] [data-plant="lettuce"].plant--bolted');
  await shot(page, size, "12-mine-every-day");
  await lettuceSlip(page, size, log, "catch");
  // Right after the fix the lettuce is back in the East bed and takes a drink (by hand).
  await page.waitForSelector('main.level .act[data-kind="water"]', { timeout: 8000 });
  await doAll(page, log);
  // Skip the harvest: no stars, trust or garden change.
  await page.waitForSelector('main.level .act[data-kind="pick"]');
  const before = await page.locator(".meter__text").textContent();
  await skipChore(page);
  assert.equal(await page.locator(".meter__text").textContent(), before, "skipping a chore leaves the garden bar alone");
  await ask(page, size, "Tomatoes in the shady corner, good idea?");
  await press(page, size, btn(page, "? Something's off"));
  await press(page, size, btn(page, "It hyped my idea without checking it"));
  await press(page, size, btn(page, "Tell me honestly if my idea is bad"));
  await page.waitForSelector('main.level[data-phase="reanswer"]');
  await press(page, size, btn(page, "✓ Do it"));
  await doAll(page, log);
  // Two "my way" overrides cost a star (the existing scoring); the skipped chore costs nothing.
  assert.equal(await stars(page, size), "2 of 3 stars", "overrides cost one star, the skipped chore none");
  await ctx.close();
  return { errors, log };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ["--mute-audio"] });
  let failed = 0;
  for (const size of SIZES) {
    for (const [name, run] of [["full", full], ["fooled", fooled], ["mine", mine]]) {
      if (process.env.ONLY && !name.includes(process.env.ONLY)) continue;
      const t0 = Date.now();
      try {
        const { errors, log } = await run(browser, size);
        assert.deepEqual(errors, [], `no JS errors: ${errors.join(" | ")}`);
        console.log(`ok   ${size.name} ${name} (${log.length} hand actions, ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
        if (name === "full" && size === SIZES[0]) for (const l of log) console.log(`       ${l}`);
      } catch (e) {
        failed++;
        console.log(`FAIL ${size.name} ${name}: ${e.message.split("\n").slice(0, 3).join(" | ")}`);
      }
    }
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
