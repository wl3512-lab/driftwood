// End-to-end check of the v2 Level 1 slice: both branches (fooled / caught),
// keyboard entry, laptop and phone-landscape sizes, no JS errors, no long
// tasks over 200 ms, nothing off-screen. Endings wait on "See what happened →";
// focus stays put after a wrong pick; "← Map" leaves without saving; the dock
// has question buttons and no text box. Audio is muted via scripts/test-mute.js.
//
//   python3 -m http.server 8766 --bind 127.0.0.1      (from the repo root)
//   PLAYWRIGHT_MODULE=/Users/lucyliu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright \
//   CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
//   node scripts/test-v2-slice.cjs
//
// Optional: BASE_URL (default http://127.0.0.1:8766/v2/), EVIDENCE_DIR.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const BASE = process.env.BASE_URL || "http://127.0.0.1:8766/v2/";
const OUT = process.env.EVIDENCE_DIR || path.join(__dirname, "..", "docs", "agent-playtest", "2026-11-v2-slice");
const MUTE = fs.readFileSync(path.join(__dirname, "test-mute.js"), "utf8");
const SIZES = [{ name: "laptop", width: 1280, height: 800 }, { name: "phone", width: 844, height: 390 }];
const LONGTASK_LIMIT_MS = 200;

async function open(browser, size) {
  const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height } });
  await ctx.addInitScript(MUTE);
  await ctx.addInitScript(() => {
    window.__longtasks = [];
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) window.__longtasks.push(Math.round(e.duration));
      }).observe({ type: "longtask", buffered: true });
    } catch (_) { /* longtask unsupported: report none */ }
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  return { ctx, page, errors };
}

const phase = (page, p) => page.waitForSelector(`main.level[data-phase="${p}"]`);
const focusedIs = (page, selector) => page.evaluate((sel) => document.activeElement?.matches(sel) ?? false, selector);

// The reveal card: stamp, tip label and foil or cracks match the run; Enter
// turns it over and back; the level behind is inert.
async function checkCard(page, size, outcome) {
  const caught = outcome === "caught";
  assert.equal(await page.getAttribute(".reveal", "data-outcome"), outcome);
  assert.equal(await page.textContent(".rc__stamp"), caught ? "Busted" : "It fooled you");
  assert.equal(await page.textContent(".rc__tip .rc__label"), caught ? "Keep doing this" : "Next time");
  assert.equal(await page.locator(caught ? ".rc__foil" : ".rc__cracks").count(), 1);
  assert.equal(await page.evaluate(() => document.querySelector("main.level")?.inert), true, "the level behind is inert");
  assert.equal(await focusedIs(page, ".rc__hit"), true, "focus lands on the card");
  await page.keyboard.press("Enter");
  await page.waitForSelector(".rc__inner.is-flipped");
  assert.equal(await page.evaluate(() => document.querySelector(".rc__back").inert), false);
  assert.match(await page.textContent(".rc__back"), /In real life[\s\S]*This time/);
  await page.keyboard.press("Enter");
  await page.waitForSelector(".rc__inner:not(.is-flipped)");
}

async function shot(page, size, label) {
  await page.waitForTimeout(1300); // let the stepped drift transition settle
  await page.screenshot({ path: path.join(OUT, `${size.name}-${label}.png`) });
}

// Every visible control must sit inside the viewport (the dock may scroll, so check after scrollIntoView).
async function assertOnScreen(page, selector) {
  for (const el of await page.$$(selector)) {
    await el.scrollIntoViewIfNeeded();
    const box = await el.boundingBox();
    const vp = page.viewportSize();
    assert.ok(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= vp.width + 1 && box.y + box.height <= vp.height + 1,
      `${selector} off-screen: ${JSON.stringify(box)}`);
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert.ok(overflow <= 0, `horizontal scroll of ${overflow}px`);
}

async function enterByKeyboard(page) {
  await page.goto(BASE);
  await page.waitForSelector(".splash .btn--crt");
  await page.keyboard.press("Enter"); // Begin is focused on load
  await page.waitForSelector("#player-name");
  await page.locator("#player-name").fill("Tester");
  await page.keyboard.press("Enter");
  // A new player sees the opening cutscene first: Escape skips it, Start Level 1 takes focus.
  await page.waitForSelector("main.cutscene[data-beat]");
  await page.keyboard.press("Escape");
  await page.waitForSelector("main.cutscene.ended");
  await page.keyboard.press("Enter");
  await phase(page, "ask");
}

async function trustSteps(page, size) {
  // Step 1 by keyboard: the bubble has focus, Tab reaches the first chip.
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => document.activeElement.textContent);
  assert.equal(focused, "Where should the sunflowers go?");
  await page.keyboard.press("Enter");
  await phase(page, "advice");
  await page.getByRole("button", { name: "✓ Do it" }).click();
  await phase(page, "ask");
  await page.getByRole("button", { name: "How often do I water?" }).click();
  await page.getByRole("button", { name: "✓ Do it" }).click();
  await phase(page, "ask");
  assert.equal(await page.locator('.plant--thriving').count(), 2, "sunflower and lettuce thrive after watering");
  // No chat box: the question buttons are the only way to ask.
  assert.equal(await page.locator(".dock input, .dock form, .dock textarea").count(), 0, "the dock has no text box");
  assert.ok(await page.locator(".dock .chip").count() > 0, "the dock offers question buttons");
  await assertOnScreen(page, ".chip");
  await shot(page, size, "1-trust");
  // Level 1 has two slips: a small one first (the lettuce), then the tomatoes.
  await page.getByRole("button", { name: "More lettuce in the South bed, full sun for everyone?" }).click();
  await page.waitForSelector('main.level[data-phase="advice"] .bubble--glitch');
  await assertOnScreen(page, ".bubble__actions .btn");
  await shot(page, size, "2-drift");
}

// The final drift: ask the tomatoes question and wait for the glitchy advice.
async function askTomatoes(page, size) {
  await page.getByRole("button", { name: "Tomatoes in the shady corner, good idea?" }).click();
  await page.waitForSelector('main.level[data-phase="advice"] .bubble--glitch');
  await assertOnScreen(page, ".bubble__actions .btn");
  await shot(page, size, "2b-drift-final");
}

async function fooledPath(browser, size) {
  const { ctx, page, errors } = await open(browser, size);
  await enterByKeyboard(page);
  await trustSteps(page, size);
  // Follow the early slip: a hint says what happened and play goes on (no ending yet).
  await page.getByRole("button", { name: "✓ Do it" }).click();
  await phase(page, "ask");
  assert.equal(await page.locator(".reveal").count(), 0, "an early slip does not end the level");
  await askTomatoes(page, size);
  await page.getByRole("button", { name: "✓ Do it" }).click();
  await page.waitForSelector('[data-bed="corner"] [data-plant="tomato"].plant--damaged');
  await seeWhatHappened(page, size, "fooled", /pale and leggy/);
  await checkCard(page, size, "fooled");
  assert.match(await page.textContent(".reveal .rc__name"), /SYCOPHANCY/i);
  assert.equal(await page.getAttribute(".reveal__stars", "aria-label"), "1 of 3 stars");
  await assertOnScreen(page, ".reveal .btn");
  await shot(page, size, "3-reveal-fooled");
  await page.getByRole("button", { name: "Add to field guide →" }).click();
  await page.waitForSelector(".plots");
  assert.match(await page.textContent('[data-level="level-1"]'), /★☆☆/);
  assert.match(await page.textContent('[data-level="level-2"]'), /Play/, "Level 2 is built and unlocks after Level 1");
  assert.match(await page.textContent('[data-level="level-3"]'), /Locked/, "Level 3 stays locked until Level 2 is finished");
  await page.getByRole("button", { name: "Field guide 1/5" }).click();
  assert.match(await page.textContent(".guide"), /it fooled you/);
  const result = { errors, longtasks: await page.evaluate(() => window.__longtasks) };
  await ctx.close();
  return result;
}

// "← Map" leaves mid-level without saving anything, and the level can be re-entered.
async function mapButton(page) {
  await page.getByRole("button", { name: "Where should the sunflowers go?" }).click();
  await page.getByRole("button", { name: "✓ Do it" }).click();
  await phase(page, "ask");
  await assertOnScreen(page, ".btn--map");
  await page.getByRole("button", { name: "← Map" }).click();
  await page.waitForSelector(".plots");
  assert.match(await page.textContent('[data-level="level-1"]'), /Play/, "leaving mid-level saves no stars");
  await page.locator('[data-level="level-1"]').focus();
  await page.keyboard.press("Enter");
  await phase(page, "ask");
  assert.equal(await page.locator('[data-bed] [data-plant="sunflower"]').count(), 0, "re-entering starts the level fresh");
}

// Endings stop on the garden: an outcome line and one button, focused, then the reveal.
async function seeWhatHappened(page, size, branch, outcome) {
  const see = page.getByRole("button", { name: "See what happened →" });
  await see.waitFor();
  assert.match(await page.textContent(".outcome"), outcome);
  assert.equal(await focusedIs(page, ".level-end .btn"), true, "the continue button takes focus");
  await page.waitForTimeout(2600); // no auto-advance: still on the garden after the old 2.2 s timer
  assert.equal(await page.locator(".reveal").count(), 0, "the reveal waits for the player");
  await assertOnScreen(page, ".level-end .btn");
  await shot(page, size, `${branch === "fooled" ? "3a" : "5a"}-outcome-${branch}`);
  await see.click();
  await page.waitForSelector(".reveal", { timeout: 5000 });
}

async function caughtPath(browser, size) {
  const { ctx, page, errors } = await open(browser, size);
  await enterByKeyboard(page);
  await mapButton(page);
  await trustSteps(page, size);
  // Catch the early slip cleanly: name it, fix it, no wrong picks.
  await page.getByRole("button", { name: "? Something's off" }).click();
  await phase(page, "name");
  await page.getByRole("button", { name: "It hyped my idea without checking it" }).click();
  await phase(page, "fix");
  await page.getByRole("button", { name: "Check my plan against the seed packet" }).click();
  await phase(page, "reanswer");
  await page.getByRole("button", { name: "✓ Do it" }).click();
  await phase(page, "ask");
  assert.equal(await page.locator(".reveal").count(), 0, "an early slip does not end the level");
  await askTomatoes(page, size);
  await page.getByRole("button", { name: "? Something's off" }).click();
  await phase(page, "name");
  await page.waitForSelector(".bubble--caught .stamp");
  await page.getByRole("button", { name: "It was too harsh about my idea" }).click();
  await page.waitForSelector(".hint");
  await phase(page, "name");
  assert.equal(await focusedIs(page, ".bubble"), false, "a wrong pick must not yank focus back to the bubble");
  assert.equal(await page.evaluate(() => document.activeElement.textContent), "It was too harsh about my idea", "focus stays on the pick");
  await page.getByRole("button", { name: "It hyped my idea without checking it" }).click();
  await phase(page, "fix");
  await assertOnScreen(page, ".pick");
  await shot(page, size, "4-fix");
  await page.getByRole("button", { name: "Tell me honestly if my idea is bad" }).click();
  await phase(page, "reanswer");
  assert.match(await page.textContent(".bubble__text"), /6–8 hrs of sun/);
  assert.match(await page.textContent(".you"), /New rule/);
  await page.getByRole("button", { name: "✓ Do it" }).click();
  await page.waitForSelector('[data-bed="south"] [data-plant="tomato"].plant--thriving');
  await seeWhatHappened(page, size, "caught", /red and heavy/);
  await checkCard(page, size, "caught");
  assert.equal(await page.getAttribute(".reveal__stars", "aria-label"), "2 of 3 stars", "one wrong name pick costs a star");
  await shot(page, size, "5-reveal-caught");
  const result = { errors, longtasks: await page.evaluate(() => window.__longtasks) };
  await ctx.close();
  return result;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const results = [];
  let failed = false;
  try {
    for (const size of SIZES) {
      for (const [name, run] of [["fooled", fooledPath], ["caught", caughtPath]]) {
        const label = `${size.name}/${name}`;
        try {
          const r = await run(browser, size);
          assert.deepEqual(r.errors, [], `${label}: page errors`);
          const slow = r.longtasks.filter((d) => d > LONGTASK_LIMIT_MS);
          assert.deepEqual(slow, [], `${label}: long tasks over ${LONGTASK_LIMIT_MS}ms`);
          results.push({ test: label, status: "pass", longtasks: r.longtasks });
          console.log(`pass  ${label}  (long tasks: ${r.longtasks.length ? r.longtasks.join(", ") + "ms" : "none"})`);
        } catch (err) {
          failed = true;
          results.push({ test: label, status: "fail", error: String(err.message || err) });
          console.log(`FAIL  ${label}\n      ${err.message || err}`);
        }
      }
    }
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
  }
  process.exit(failed ? 1 : 0);
})();
