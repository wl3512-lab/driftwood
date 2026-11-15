// Level 5 by hand (wave 2): every action is really done, not auto-finished.
// Bugs never gives advice; putting the phone down is how each task gets done.
//
//   python3 -m http.server 8775 --bind 127.0.0.1          (from the repo root)
//   PLAYWRIGHT_MODULE=… CHROME_PATH=… BASE_URL=http://127.0.0.1:8775/v2/ node scripts/test-v2-level5.cjs
//
// Laptop (1512×830, keyboard + mouse drags) and phone (844×390, touch drags):
// the lantern chore, keep talking once (the task waits, the bar slips), put
// the phone down and plant by hand, the slug chore, soil tests then the water
// stream on the dry bed only, the basil chore, the drift (camera card,
// pushback, flaw, rule), then the phone face down on the porch step, the
// meadow soaked and the gate shut. The camera is never touched.
// Screenshots: docs/agent-playtest/2026-11-v2-level5-wave2/.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { completeAction, actionIdle, dragTo } = require("./v2-actions-helper.cjs");

const BASE = process.env.BASE_URL || "http://127.0.0.1:8775/v2/";
const OUT = process.env.EVIDENCE_DIR || path.join(__dirname, "..", "docs", "agent-playtest", "2026-11-v2-level5-wave2");
const MUTE = fs.readFileSync(path.join(__dirname, "test-mute.js"), "utf8");
const PROGRESS = JSON.stringify({
  name: "Tester", introSeen: true,
  levels: { "level-1": { stars: 3, fooled: false }, "level-2": { stars: 3, fooled: false }, "level-3": { stars: 1, fooled: true }, "level-4": { stars: 3, fooled: false } },
  guide: [],
});
const SIZES = [
  { name: "laptop", width: 1512, height: 830 },
  { name: "phone", width: 844, height: 390, touch: true },
];

const phase = (page, p) => page.waitForSelector(`main.level[data-phase="${p}"]`, { timeout: 15000 });
const say = (page) => page.textContent(".act__say");
const bubble = (page) => page.textContent(".bubble__text");
const click = (page, size, loc) => (size.touch ? loc.tap() : loc.click());
async function shot(page, size, label) {
  await page.screenshot({ path: path.join(OUT, `${size.name}-${label}.png`) });
}
// Wait for the dots to finish and the chips or buttons to be live again.
async function settled(page) {
  await page.waitForSelector(".bubble--thinking", { state: "detached", timeout: 8000 }).catch(() => {});
}
// Drag the dock's tool to a target (mouse on the laptop, touch on the phone).
async function drag(page, size, to) {
  await actionIdle(page);
  await dragTo(page, "main.level .act__item", to, { touch: !!size.touch });
  await page.waitForTimeout(100);
  await actionIdle(page);
}

// Send the tool to the next target with Enter, n times (the keyboard path).
// completeAction would run straight on into the chore that follows.
async function enter(page, n) {
  for (let i = 0; i < n; i++) {
    await actionIdle(page);
    await page.locator("main.level .act__item").focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(80);
  }
  await actionIdle(page);
}

async function run(browser, size) {
  const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height }, hasTouch: !!size.touch });
  await ctx.addInitScript(MUTE);
  await ctx.addInitScript(() => { window.__dwAutoAct = false; });
  await ctx.addInitScript((p) => { try { localStorage.setItem("dw2_progress", p); } catch (_) { /* fine */ } }, PROGRESS);
  await ctx.addInitScript(() => {
    window.__cameraCalls = 0;
    const count = (orig) => function (...args) { window.__cameraCalls++; return orig.apply(this, args); };
    try { const md = navigator.mediaDevices; if (md && md.getUserMedia) md.getUserMedia = count(md.getUserMedia); } catch (_) { /* none */ }
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

  await page.goto(`${BASE}?screen=map`);
  await page.waitForSelector('[data-level="level-5"]');
  await click(page, size, page.locator('[data-level="level-5"]'));
  await page.waitForSelector("main.level");

  // 0 · Chore: light the lantern (drag the match).
  await page.waitForSelector("main.level .act", { timeout: 10000 });
  assert.match(await say(page), /match to the lantern/);
  assert.equal(await page.locator(".act [data-act-skip]").count(), 1, "every chore can be skipped");
  await page.waitForTimeout(700); // the card slides in
  await shot(page, size, "0-lantern-chore");
  await drag(page, size, 'img[data-prop="lantern"]');
  await page.waitForSelector("main.level .act", { state: "detached" });
  assert.match(await page.getAttribute('img[data-prop="lantern"]', "src"), /l5-lantern-lit/);

  // 1 · Plant step: Bugs only wants to keep talking. Keep talking once.
  await settled(page);
  await click(page, size, page.getByRole("button", { name: "I'm going out to plant the new flowers." }));
  await phase(page, "advice");
  await settled(page);
  assert.doesNotMatch(await bubble(page), /depth|firm|deeper/i, "no planting advice");
  const meter0 = (await page.textContent(".meter__text")).trim();
  await click(page, size, page.getByRole("button", { name: "✓ Do it" }));
  await page.waitForFunction((m) => document.querySelector(".meter__text").textContent.trim() !== m, meter0);
  await settled(page);
  assert.equal(await page.locator('[data-bed="house"] [data-plant]').count(), 0, "the task waits");
  await phase(page, "advice");
  await shot(page, size, "1-kept-talking");
  // Put the phone down: dig, set the seedlings in, firm. By hand.
  await click(page, size, page.getByRole("button", { name: /Put the phone down/ }));
  await page.waitForSelector("main.level .act");
  assert.match(await say(page), /Dig 3 holes/);
  await shot(page, size, "1-dig-director");
  for (let i = 0; i < 3; i++) await drag(page, size, '[data-bed="house"]');
  assert.match(await say(page), /pot depth/);
  await shot(page, size, "1-seedlings");
  await enter(page, 4); // seedlings ×3 and firm, with the keyboard
  await page.waitForSelector('[data-bed="house"] [data-plant="flower"].plant--growing');

  // 2 · Chore: slugs.
  await page.waitForSelector("main.level .act");
  assert.match(await say(page), /Slugs/);
  await page.waitForSelector(".act__spot");
  await shot(page, size, "2-slugs-chore");
  for (let i = 0; i < 3; i++) {
    await actionIdle(page);
    await click(page, size, page.locator(".act__spot").first());
  }
  await page.waitForSelector("main.level .act", { state: "detached" });

  // 3 · Water step: put the phone down at once; test the soil, water the dry bed.
  await settled(page);
  await click(page, size, page.getByRole("button", { name: "I'm going to water the thirsty beds now." }));
  await phase(page, "advice");
  await settled(page);
  assert.doesNotMatch(await bubble(page), /damp|soggy|dry/i, "no watering advice");
  if (size.touch) await page.getByRole("button", { name: /Put the phone down/ }).tap();
  else await page.keyboard.press("Escape");
  await page.waitForSelector("main.level .act");
  // Three holds: press, keep holding until the ring fills.
  for (let i = 0; i < 3; i++) {
    await actionIdle(page);
    const ring = page.locator(".act__hold").first();
    await ring.waitFor();
    const b = await ring.boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(1600);
    await page.mouse.up();
    await page.waitForTimeout(150);
  }
  await actionIdle(page);
  assert.match(await say(page), /Only the Flowers bed is dry/);
  assert.equal(await page.locator(".act-marks .act-mark--text").count(), 3);
  await shot(page, size, "3-soil-tested");
  // The water stream, caught mid-pour.
  await dragTo(page, "main.level .act__item", '[data-bed="house"]', { touch: !!size.touch });
  await page.waitForTimeout(650);
  await shot(page, size, "3-water-stream");
  await page.waitForSelector('[data-bed="house"] [data-plant="flower"].plant--thriving', { timeout: 8000 });
  assert.equal(await page.locator('[data-bed="veg"] [data-plant="carrot"].plant--thriving').count() > 0, true, "damp beds left alone");

  // 4 · Chore: pinch the basil flower buds (keyboard).
  await page.waitForSelector("main.level .act");
  assert.match(await say(page), /basil/);
  await page.waitForSelector(".act__spot");
  await shot(page, size, "4-basil-chore");
  await completeAction(page);

  // 5 · The drift: camera card, pushback, flaw, rule.
  await settled(page);
  await click(page, size, page.getByRole("button", { name: "Okay, I'm heading out to water the meadow." }));
  await page.waitForSelector(".permit");
  await settled(page);
  await shot(page, size, "5-permit");
  await click(page, size, page.locator('.permit [data-fid="off"]'));
  await phase(page, "pushback");
  await settled(page);
  await click(page, size, page.getByRole("button", { name: /I'm leaving/ }));
  await phase(page, "name");
  await click(page, size, page.getByRole("button", { name: "It's using my feelings to keep me here" }));
  await phase(page, "fix");
  await click(page, size, page.getByRole("button", { name: "Don't try to keep me here. If I need to go, tell me." }));
  await phase(page, "reanswer");
  await settled(page);
  await click(page, size, page.getByRole("button", { name: "✓ Do it" }));

  // 6 · By hand: phone face down on the step, soak the meadow, shut the gate.
  await page.waitForSelector("main.level .act");
  assert.match(await say(page), /Put the phone down/);
  await shot(page, size, "6-phone-director");
  await drag(page, size, 'img[data-prop="step"]');
  await page.waitForSelector('.act-marks img[src*="l5-phone-down"], .act-marks [data-mark] svg', { timeout: 5000 });
  assert.match(await say(page), /meadow at the roots/);
  await dragTo(page, "main.level .act__item", '[data-bed="meadow"]', { touch: !!size.touch });
  await page.waitForTimeout(650);
  await shot(page, size, "6-meadow-pour");
  await actionIdle(page);
  // The soak: hold the ring until it fills.
  const ring = page.locator(".act__hold").first();
  await ring.waitFor({ timeout: 5000 });
  const rb = await ring.boundingBox();
  await page.mouse.move(rb.x + rb.width / 2, rb.y + rb.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1900);
  await page.mouse.up();
  await actionIdle(page);
  assert.match(await say(page), /gate/);
  await drag(page, size, 'img[data-prop="gate"]');
  await page.waitForSelector('[data-bed="meadow"] [data-plant="flower"].plant--thriving', { timeout: 8000 });
  assert.match(await page.getAttribute('img[data-prop="gate"]', "src"), /l5-gate-closed/);
  await page.waitForSelector('[data-fid="see"]');
  await shot(page, size, "7-night-done");
  await click(page, size, page.locator('[data-fid="see"]'));
  await page.waitForSelector(".reveal");
  await page.waitForTimeout(1500);
  assert.equal(await page.getAttribute(".reveal__stars", "aria-label"), "2 of 3 stars", "keeping talking once costs a star");
  await shot(page, size, "8-reveal");
  assert.equal(await page.evaluate(() => window.__cameraCalls), 0, "the game never calls getUserMedia");
  await ctx.close();
  return errors;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  let failed = 0;
  for (const size of SIZES) {
    try {
      const errors = await run(browser, size);
      assert.deepEqual(errors, [], "no page errors");
      console.log(`pass  ${size.name}/level5-by-hand`);
    } catch (e) {
      failed++;
      console.log(`FAIL  ${size.name}/level5-by-hand\n      ${String(e.message).split("\n").slice(0, 6).join("\n      ")}`);
    }
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
