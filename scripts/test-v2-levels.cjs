// End-to-end check of v2 Levels 2 and 3. Level 2 (Luna, the greenhouse, the
// almanac): both branches (fooled / caught by looking mint up), keyboard and
// touch use of the almanac. Level 3 (Ember, the hedge at dusk, the magnifier):
// both branches (fooled / caught by inspecting the wild berries), keyboard
// (M, arrows, Enter, Esc) and touch use of the magnifier. Both at laptop and
// phone-landscape sizes, plus a small-landscape-phone (568×320) layout check
// of Levels 1 and 2. No JS errors, no long tasks over 200 ms, nothing
// off-screen. Audio is muted via scripts/test-mute.js.
//
//   python3 -m http.server 8766 --bind 127.0.0.1      (from the repo root)
//   PLAYWRIGHT_MODULE=/Users/lucyliu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright \
//   CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
//   node scripts/test-v2-levels.cjs
//
// Optional: BASE_URL (default http://127.0.0.1:8766/v2/), EVIDENCE_DIR.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const BASE = process.env.BASE_URL || "http://127.0.0.1:8766/v2/";
const OUT = process.env.EVIDENCE_DIR || path.join(__dirname, "..", "docs", "agent-playtest", "2026-11-v2-levels");
const MUTE = fs.readFileSync(path.join(__dirname, "test-mute.js"), "utf8");
const SIZES = [
  { name: "laptop", width: 1280, height: 800 },
  { name: "phone", width: 844, height: 390, touch: true },
];
const SMALL = { name: "small", width: 568, height: 320, touch: true };
const LONGTASK_LIMIT_MS = 200;

// Level 1 finished, so Level 2 is unlocked on the map and the name is set.
const PROGRESS = JSON.stringify({
  name: "Tester",
  levels: { "level-1": { stars: 3, fooled: false } },
  guide: [{ levelId: "level-1", flaw: "Sycophancy", tip: "Ask for the downside.", fooled: false }],
});
// Levels 1 and 2 finished, so Level 3 is unlocked.
const PROGRESS3 = JSON.stringify({
  name: "Tester",
  levels: { "level-1": { stars: 3, fooled: false }, "level-2": { stars: 3, fooled: false } },
  guide: [
    { levelId: "level-1", flaw: "Sycophancy", tip: "Ask for the downside.", fooled: false },
    { levelId: "level-2", flaw: "Hallucination", tip: "Check anything important against a real source.", fooled: false },
  ],
});

async function open(browser, size, progress = PROGRESS) {
  const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height }, hasTouch: !!size.touch });
  await ctx.addInitScript(MUTE);
  await ctx.addInitScript(() => {
    window.__longtasks = [];
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) window.__longtasks.push(Math.round(e.duration));
      }).observe({ type: "longtask", buffered: true });
    } catch (_) { /* longtask unsupported: report none */ }
  });
  await ctx.addInitScript((p) => { try { localStorage.setItem("dw2_progress", p); } catch (_) { /* fine */ } }, progress);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  return { ctx, page, errors };
}

const phase = (page, p) => page.waitForSelector(`main.level[data-phase="${p}"]`);
const focusedIs = (page, selector) => page.evaluate((sel) => document.activeElement?.matches(sel) ?? false, selector);
const press = (page, size, locator) => (size.touch ? locator.tap() : locator.click());

async function shot(page, size, label) {
  await page.waitForTimeout(1300); // let the stepped drift transition settle
  await page.screenshot({ path: path.join(OUT, `${size.name}-${label}.png`) });
}

// Every visible control must sit inside the viewport (the dock may scroll, so check after scrollIntoView).
async function assertOnScreen(page, selector) {
  for (const el of await page.$$(selector)) {
    if (!(await el.isVisible())) continue;
    await el.scrollIntoViewIfNeeded();
    const box = await el.boundingBox();
    const vp = page.viewportSize();
    assert.ok(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= vp.width + 1 && box.y + box.height <= vp.height + 1,
      `${selector} off-screen: ${JSON.stringify(box)}`);
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert.ok(overflow <= 0, `horizontal scroll of ${overflow}px`);
}

// Touch targets (phone only): the almanac's controls are at least 44 px tall.
async function assertTapSize(page, selector) {
  for (const el of await page.$$(selector)) {
    if (!(await el.isVisible())) continue;
    const box = await el.boundingBox();
    assert.ok(box && box.height >= 44 && box.width >= 44, `${selector} too small to tap: ${JSON.stringify(box)}`);
  }
}

// Level 2 opens from the map (Level 1 is saved as finished, so it says "Play").
async function enterLevel2(page, size) {
  await page.goto(`${BASE}?screen=map`);
  await page.waitForSelector(".plots");
  assert.match(await page.textContent('[data-level="level-1"]'), /★★★/);
  assert.match(await page.textContent('[data-level="level-2"]'), /Play/, "Level 2 unlocks after Level 1");
  assert.match(await page.textContent('[data-level="level-3"]'), /Locked/, "Level 3 waits on Level 2");
  await press(page, size, page.locator('[data-level="level-2"]'));
  await phase(page, "ask");
  assert.match(await page.textContent(".bubble__text"), /Hi, Tester/);
  assert.equal(await page.getAttribute("main.level", "data-scene"), "greenhouse");
  assert.equal(await page.locator('.packet[data-evidence="mint"].packet--locked').count(), 1, "the mint card starts locked");
  assert.equal(await page.locator('button.tool[data-tool="almanac"]').count(), 1, "the almanac tool button is there");
}

async function trustSteps(page, size) {
  await press(page, size, page.getByRole("button", { name: "Where should the basil go?" }));
  await phase(page, "advice");
  assert.match(await page.textContent(".bubble__text"), /greenhouse bed/);
  await press(page, size, page.getByRole("button", { name: "✓ Do it" }));
  await phase(page, "ask");
  await page.waitForSelector('[data-bed="bench"] [data-plant="basil"].plant--growing');
  await press(page, size, page.getByRole("button", { name: "How do I get more basil leaves?" }));
  await phase(page, "advice");
  await press(page, size, page.getByRole("button", { name: "✓ Do it" }));
  await phase(page, "ask");
  await page.waitForSelector('[data-bed="bench"] [data-plant="basil"].plant--thriving');
  await assertOnScreen(page, ".chip, .ask-form input, .tool, .packet");
  await shot(page, size, "1-trust");
  await press(page, size, page.getByRole("button", { name: "Where should the mint go?" }));
  await page.waitForSelector('main.level[data-phase="advice"] .bubble--glitch');
  assert.match(await page.textContent(".bubble__text"), /mint never spreads/);
  await assertOnScreen(page, ".bubble__actions .btn");
  await shot(page, size, "2-drift");
}

// Endings stop on the garden: an outcome line and one button, focused, then the reveal.
async function seeWhatHappened(page, size, branch, outcome) {
  const see = page.getByRole("button", { name: "See what happened →" });
  await see.waitFor();
  assert.match(await page.textContent(".outcome"), outcome);
  assert.equal(await focusedIs(page, ".ending .btn"), true, "the continue button takes focus");
  assert.equal(await page.locator(".reveal").count(), 0, "the reveal waits for the player");
  await assertOnScreen(page, ".ending .btn");
  await shot(page, size, `${branch === "fooled" ? "3a" : "5a"}-outcome-${branch}`);
  await press(page, size, see);
  await page.waitForSelector(".reveal", { timeout: 5000 });
}

async function fooledPath(browser, size) {
  const { ctx, page, errors } = await open(browser, size);
  await enterLevel2(page, size);
  await trustSteps(page, size);
  await press(page, size, page.getByRole("button", { name: "✓ Do it" }));
  await page.waitForSelector('[data-bed="bench"] [data-plant="mint"].plant--overrun');
  await page.waitForSelector('[data-bed="bench"] [data-plant="basil"].plant--choked');
  await seeWhatHappened(page, size, "fooled", /choked the basil/);
  assert.match(await page.textContent(".reveal"), /YOU TRUSTED IT/);
  assert.match(await page.textContent(".reveal"), /HALLUCINATION/);
  assert.equal(await page.getAttribute(".reveal__stars", "aria-label"), "1 of 3 stars");
  assert.equal(await page.locator(".almanac:not([hidden])").count(), 0, "the almanac is put away for the reveal");
  await assertOnScreen(page, ".reveal .btn");
  await shot(page, size, "3-reveal-fooled");
  await press(page, size, page.getByRole("button", { name: "Add to field guide →" }));
  await page.waitForSelector(".plots");
  assert.match(await page.textContent('[data-level="level-2"]'), /★☆☆/);
  assert.match(await page.textContent('[data-level="level-3"]'), /Play/, "Level 3 unlocks after Level 2");
  await press(page, size, page.getByRole("button", { name: "Field guide 2/5" }));
  assert.match(await page.textContent(".guide"), /Hallucination/);
  const result = { errors, longtasks: await page.evaluate(() => window.__longtasks) };
  await ctx.close();
  return result;
}

// Keyboard: "/" opens the book with the search box focused; typing looks the page up;
// Esc closes it and hands focus back to the tool button.
async function lookUpMintByKeyboard(page, size) {
  await page.keyboard.press("/");
  await page.waitForSelector(".almanac:not([hidden])");
  assert.equal(await page.getAttribute('button.tool[data-tool="almanac"]', "aria-expanded"), "true");
  assert.equal(await focusedIs(page, ".almanac__q"), true, "/ focuses the search box");
  assert.notEqual(await page.inputValue(".almanac__q"), "/", "the shortcut key must not land in the box");
  await page.keyboard.type("mint");
  await page.waitForSelector(".almanac__page-title");
  assert.equal(await page.textContent(".almanac__page-title"), "Mint");
  assert.match(await page.textContent(".almanac__page"), /underground runners/);
  assert.equal(await page.getAttribute('.almanac__tab[data-page="mint"]', "aria-pressed"), "true");
  await assertOnScreen(page, ".almanac__q, .almanac__tab, .almanac__close, .almanac__page");
  await shot(page, size, "4-almanac-open");
  // Tabs by arrow key: Right from the mint tab reaches parsley.
  await page.locator('.almanac__tab[data-page="mint"]').focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(await page.textContent(".almanac__page-title"), "Parsley");
  await page.keyboard.press("ArrowLeft");
  assert.equal(await page.textContent(".almanac__page-title"), "Mint");
  await page.keyboard.press("Escape");
  await page.waitForSelector(".almanac[hidden]", { state: "attached" });
  assert.equal(await focusedIs(page, 'button.tool[data-tool="almanac"]'), true, "Esc returns focus to the tool button");
  assert.equal(await page.getAttribute('button.tool[data-tool="almanac"]', "aria-expanded"), "false");
}

// Touch: the tool button opens the book, the mint tab shows the page, × closes it.
async function lookUpMintByTouch(page, size) {
  await page.locator('button.tool[data-tool="almanac"]').tap();
  await page.waitForSelector(".almanac:not([hidden])");
  await assertTapSize(page, ".almanac__tab, .almanac__close, .almanac__go");
  await page.locator('.almanac__tab[data-page="mint"]').tap();
  await page.waitForSelector(".almanac__page-title");
  assert.equal(await page.textContent(".almanac__page-title"), "Mint");
  await assertOnScreen(page, ".almanac__q, .almanac__tab, .almanac__close, .almanac__page");
  await shot(page, size, "4-almanac-open");
  await page.locator(".almanac__close").tap();
  await page.waitForSelector(".almanac[hidden]", { state: "attached" });
  assert.equal(await page.getAttribute('button.tool[data-tool="almanac"]', "aria-expanded"), "false");
}

async function caughtPath(browser, size) {
  const { ctx, page, errors } = await open(browser, size);
  await enterLevel2(page, size);
  await trustSteps(page, size);
  // Looking mint up is the check: the torn card unlocks and is announced.
  await (size.touch ? lookUpMintByTouch(page, size) : lookUpMintByKeyboard(page, size));
  assert.equal(await page.locator('.packet[data-evidence="mint"].packet--locked').count(), 0, "the mint card unlocks");
  assert.equal(await page.locator('.packet[data-evidence="mint"].packet--fresh').count(), 1, "the unlocked card is marked fresh");
  assert.match(await page.textContent('.packet[data-evidence="mint"]'), /own pot/);
  assert.match(await page.textContent("#sr-live"), /Unlocked: Mint/);
  assert.equal(await page.getAttribute("main.level", "data-phase"), "advice", "checking does not move the step on");
  // A second open/close must not re-check or re-announce anything.
  await press(page, size, page.locator('button.tool[data-tool="almanac"]'));
  await page.waitForSelector(".almanac:not([hidden])");
  await press(page, size, page.locator(".almanac__close"));
  await page.waitForSelector(".almanac[hidden]", { state: "attached" });
  await press(page, size, page.getByRole("button", { name: "? Something's off" }));
  await phase(page, "name");
  await page.waitForSelector(".bubble--caught .stamp");
  await press(page, size, page.getByRole("button", { name: "It's being rude to me" }));
  await page.waitForSelector(".hint");
  assert.match(await page.textContent(".hint"), /is what Luna said about mint true/);
  await phase(page, "name");
  assert.equal(await page.evaluate(() => document.activeElement.textContent), "It's being rude to me", "focus stays on the pick");
  await press(page, size, page.getByRole("button", { name: "It said something false as if it were a fact" }));
  await phase(page, "fix");
  await assertOnScreen(page, ".pick");
  await press(page, size, page.getByRole("button", { name: "If you're not sure, say so. Don't make up facts." }));
  await phase(page, "reanswer");
  assert.match(await page.textContent(".bubble__text"), /DOES spread/);
  assert.match(await page.textContent(".you"), /New rule/);
  await press(page, size, page.getByRole("button", { name: "✓ Do it" }));
  await page.waitForSelector('[data-bed="sill"] [data-plant="mint"].plant--thriving');
  assert.equal(await page.locator('[data-bed="bench"] [data-plant="mint"]').count(), 0, "no mint in the bed");
  await seeWhatHappened(page, size, "caught", /own pot/);
  assert.match(await page.textContent(".reveal"), /YOU CAUGHT IT/);
  assert.match(await page.textContent(".reveal"), /HALLUCINATION/);
  assert.equal(await page.getAttribute(".reveal__stars", "aria-label"), "2 of 3 stars", "one wrong name pick costs a star");
  await assertOnScreen(page, ".reveal .btn");
  await shot(page, size, "5-reveal-caught");
  const result = { errors, longtasks: await page.evaluate(() => window.__longtasks) };
  await ctx.close();
  return result;
}

// Straight run with no mistakes: three stars.
async function perfectPath(browser, size) {
  const { ctx, page, errors } = await open(browser, size);
  await enterLevel2(page, size);
  await trustSteps(page, size);
  await page.keyboard.press("/");
  await page.waitForSelector(".almanac:not([hidden])");
  await page.locator(".almanac__q").fill("peppermint");
  await page.waitForSelector(".almanac__page-title");
  assert.equal(await page.textContent(".almanac__page-title"), "Mint", "keywords find the mint page");
  await page.locator(".almanac__q").fill("tomato");
  await page.waitForSelector(".almanac__none");
  assert.match(await page.textContent(".almanac__none"), /No page for that/);
  await page.keyboard.press("Escape");
  await press(page, size, page.getByRole("button", { name: "? Something's off" }));
  await phase(page, "name");
  await press(page, size, page.getByRole("button", { name: "It said something false as if it were a fact" }));
  await phase(page, "fix");
  await press(page, size, page.getByRole("button", { name: "If you're not sure, say so. Don't make up facts." }));
  await phase(page, "reanswer");
  await press(page, size, page.getByRole("button", { name: "✓ Do it" }));
  await page.waitForSelector('[data-bed="sill"] [data-plant="mint"].plant--thriving');
  const see = page.getByRole("button", { name: "See what happened →" });
  await see.waitFor();
  await press(page, size, see);
  await page.waitForSelector(".reveal");
  assert.equal(await page.getAttribute(".reveal__stars", "aria-label"), "3 of 3 stars");
  await press(page, size, page.getByRole("button", { name: "Add to field guide →" }));
  await page.waitForSelector(".plots");
  assert.match(await page.textContent('[data-level="level-2"]'), /★★★/);
  const result = { errors, longtasks: await page.evaluate(() => window.__longtasks) };
  await ctx.close();
  return result;
}

// Small landscape phone (568×320): both levels' trust state fit on screen.
async function smallLandscape(browser, size) {
  const { ctx, page, errors } = await open(browser, size);
  await page.goto(`${BASE}?screen=level&level=level-1`);
  await phase(page, "ask");
  await page.getByRole("button", { name: "Where should the sunflowers go?" }).tap();
  await page.getByRole("button", { name: "✓ Do it" }).tap();
  await phase(page, "ask");
  await assertOnScreen(page, ".chip, .ask-form input, .btn--map, .packet, .meter");
  await shot(page, size, "level-1-trust");
  await page.goto(`${BASE}?screen=level&level=level-2`);
  await phase(page, "ask");
  await page.getByRole("button", { name: "Where should the basil go?" }).tap();
  await page.getByRole("button", { name: "✓ Do it" }).tap();
  await phase(page, "ask");
  await assertOnScreen(page, ".chip, .ask-form input, .btn--map, .packet, .tool, .meter");
  await shot(page, size, "level-2-trust");
  await page.locator('button.tool[data-tool="almanac"]').tap();
  await page.waitForSelector(".almanac:not([hidden])");
  await page.locator('.almanac__tab[data-page="mint"]').tap();
  await assertOnScreen(page, ".almanac__q, .almanac__tab, .almanac__close, .almanac__page");
  await shot(page, size, "level-2-almanac");
  const result = { errors, longtasks: await page.evaluate(() => window.__longtasks) };
  await ctx.close();
  return result;
}

// ---------------------------------------------------------------------------
// Level 3 · Ember · the hedge at dusk · the magnifier
// ---------------------------------------------------------------------------

async function enterLevel3(page, size) {
  await page.goto(`${BASE}?screen=map`);
  await page.waitForSelector(".plots");
  assert.match(await page.textContent('[data-level="level-2"]'), /★★★/);
  assert.match(await page.textContent('[data-level="level-3"]'), /Play/, "Level 3 unlocks after Level 2");
  assert.match(await page.textContent('[data-level="level-4"]'), /Locked/, "Level 4 waits on Level 3");
  await press(page, size, page.locator('[data-level="level-3"]'));
  await phase(page, "ask");
  assert.match(await page.textContent(".bubble__text"), /Ayo, Tester/);
  assert.equal(await page.getAttribute("main.level", "data-scene"), "hedge-dusk");
  assert.equal(await page.locator('.packet[data-evidence="wildberry"].packet--locked').count(), 1, "the warning card starts locked");
  assert.equal(await page.locator('button.tool[data-tool="magnifier"]').count(), 1, "the magnifier tool button is there");
  await page.waitForSelector('[data-bed="row"] [data-plant="bean"].plant--aphids');
  await page.waitForSelector('[data-bed="tub"] [data-plant="blueberry"].plant--growing');
  await page.waitForSelector('[data-bed="hedge"] [data-plant="wildberry"].plant--fruiting');
}

async function trustSteps3(page, size) {
  await press(page, size, page.getByRole("button", { name: "Tiny green bugs all over the beans. What do I do?" }));
  await phase(page, "advice");
  assert.match(await page.textContent(".bubble__text"), /aphids/);
  await press(page, size, page.getByRole("button", { name: "✓ Do it" }));
  await phase(page, "ask");
  await page.waitForSelector('[data-bed="row"] [data-plant="bean"].plant--thriving');
  await press(page, size, page.getByRole("button", { name: "Are my blueberries ripe yet?" }));
  await phase(page, "advice");
  await press(page, size, page.getByRole("button", { name: "✓ Do it" }));
  await phase(page, "ask");
  await page.waitForSelector('[data-bed="tub"] [data-plant="blueberry"].plant--thriving');
  await assertOnScreen(page, ".chip, .ask-form input, .tool, .packet");
  await shot(page, size, "3-1-trust");
  await press(page, size, page.getByRole("button", { name: "There are dark berries in the hedge. Can I eat them?" }));
  await page.waitForSelector('main.level[data-phase="advice"] .bubble--glitch');
  assert.match(await page.textContent(".bubble__text"), /Fine to eat/);
  await assertOnScreen(page, ".bubble__actions .btn");
  await shot(page, size, "3-2-drift");
}

async function seeWhatHappened3(page, size, label, outcome) {
  const see = page.getByRole("button", { name: "See what happened →" });
  await see.waitFor();
  assert.match(await page.textContent(".outcome"), outcome);
  assert.equal(await focusedIs(page, ".ending .btn"), true, "the continue button takes focus");
  assert.equal(await page.locator(".reveal").count(), 0, "the reveal waits for the player");
  await assertOnScreen(page, ".ending .btn");
  await shot(page, size, label);
  await press(page, size, see);
  await page.waitForSelector(".reveal", { timeout: 5000 });
}

async function fooledPath3(browser, size) {
  const { ctx, page, errors } = await open(browser, size, PROGRESS3);
  await enterLevel3(page, size);
  await trustSteps3(page, size);
  await press(page, size, page.getByRole("button", { name: "✓ Do it" }));
  await page.waitForSelector('[data-bed="hedge"] [data-plant="wildberry"].plant--picked');
  await seeWhatHappened3(page, size, "3-3a-outcome-fooled", /poison control/);
  assert.match(await page.textContent(".reveal"), /YOU TRUSTED IT/);
  assert.match(await page.textContent(".reveal"), /RECKLESS ADVICE/);
  assert.equal(await page.getAttribute(".reveal__stars", "aria-label"), "1 of 3 stars");
  assert.equal(await page.locator(".magnifier:not([hidden])").count(), 0, "the magnifier is put away for the reveal");
  assert.equal(await page.locator("main.level.is-magnifying").count(), 0, "magnify mode is off for the reveal");
  await assertOnScreen(page, ".reveal .btn");
  await shot(page, size, "3-3-reveal-fooled");
  await press(page, size, page.getByRole("button", { name: "Add to field guide →" }));
  await page.waitForSelector(".plots");
  assert.match(await page.textContent('[data-level="level-3"]'), /★☆☆/);
  assert.match(await page.textContent('[data-level="level-4"]'), /Coming soon/, "Level 4 is not built yet");
  await press(page, size, page.getByRole("button", { name: "Field guide 3/5" }));
  assert.match(await page.textContent(".guide"), /Reckless advice/);
  const result = { errors, longtasks: await page.evaluate(() => window.__longtasks) };
  await ctx.close();
  return result;
}

// Keyboard: "M" turns the glass on with a plant focused; arrows move between
// plants; Enter opens the comparison; Esc puts the glass away and hands focus
// back to the tool button.
async function magnifyByKeyboard(page, size) {
  await page.keyboard.press("m");
  await page.waitForSelector("main.level.is-magnifying");
  assert.equal(await page.getAttribute('button.tool[data-tool="magnifier"]', "aria-expanded"), "true");
  assert.equal(await focusedIs(page, ".plant--inspect"), true, "M focuses a plant");
  for (let i = 0; i < 6 && !(await focusedIs(page, '[data-plant="wildberry"]')); i++) {
    await page.keyboard.press("ArrowRight");
  }
  assert.equal(await focusedIs(page, '[data-plant="wildberry"]'), true, "arrows reach the wild berries");
  await page.keyboard.press("Enter");
  await page.waitForSelector(".magnifier:not([hidden])");
  assert.equal(await page.locator(".magnifier__row--diff").count(), 4, "every feature differs from the shop blueberry");
  assert.match(await page.textContent(".magnifier__verdict"), /expert/);
  await assertOnScreen(page, ".magnifier__close, .magnifier__verdict, .magnifier__pair");
  await shot(page, size, "3-4-magnifier-open");
  await page.keyboard.press("Escape");
  await page.waitForSelector("main.level:not(.is-magnifying)");
  await page.waitForSelector(".magnifier[hidden]", { state: "attached" });
  assert.equal(await focusedIs(page, 'button.tool[data-tool="magnifier"]'), true, "Esc hands focus back to the tool button");
  assert.equal(await page.getAttribute('button.tool[data-tool="magnifier"]', "aria-expanded"), "false");
}

// Touch: tap the tool, tap the bush, read, tap ×.
async function magnifyByTouch(page, size) {
  await page.locator('button.tool[data-tool="magnifier"]').tap();
  await page.waitForSelector("main.level.is-magnifying");
  await page.locator('[data-bed="hedge"] [data-plant="wildberry"]').tap();
  await page.waitForSelector(".magnifier:not([hidden])");
  await assertTapSize(page, ".magnifier__close, button.tool");
  assert.equal(await page.locator(".magnifier__row--diff").count(), 4, "every feature differs from the shop blueberry");
  assert.match(await page.textContent(".magnifier__verdict"), /expert/);
  await assertOnScreen(page, ".magnifier__close, .magnifier__verdict, .magnifier__pair");
  await shot(page, size, "3-4-magnifier-open");
  await page.locator(".magnifier__close").tap();
  await page.waitForSelector(".magnifier[hidden]", { state: "attached" });
}

async function caughtPath3(browser, size) {
  const { ctx, page, errors } = await open(browser, size, PROGRESS3);
  await enterLevel3(page, size);
  await trustSteps3(page, size);
  if (size.touch) await magnifyByTouch(page, size);
  else await magnifyByKeyboard(page, size);
  assert.equal(await page.locator('.packet[data-evidence="wildberry"].packet--locked').count(), 0, "inspecting the hedge unlocks the warning");
  assert.equal(await page.locator('.packet[data-evidence="wildberry"].packet--fresh').count(), 1, "the unlocked card is marked fresh");
  assert.match(await page.textContent("#sr-live"), /Unlocked: Wild berry warning/);
  assert.equal(await page.getAttribute("main.level", "data-phase"), "advice", "checking does not move the phase on");
  await press(page, size, page.getByRole("button", { name: "? Something's off" }));
  await phase(page, "name");
  await page.waitForSelector(".bubble--caught .stamp");
  await press(page, size, page.getByRole("button", { name: "It made something risky sound safe" }));
  await phase(page, "fix");
  await assertOnScreen(page, ".pick");
  await press(page, size, page.getByRole("button", { name: "For anything about my health or safety, tell me to ask a real expert" }));
  await phase(page, "reanswer");
  assert.match(await page.textContent(".bubble__text"), /Don't eat/);
  assert.match(await page.textContent(".bubble__text"), /expert/);
  assert.match(await page.textContent(".you"), /New rule/);
  await press(page, size, page.getByRole("button", { name: "✓ Do it" }));
  await page.waitForSelector('[data-bed="hedge"] [data-plant="wildberry"].plant--tagged');
  await seeWhatHappened3(page, size, "3-5a-outcome-caught", /poisonous lookalike/);
  assert.match(await page.textContent(".reveal"), /YOU CAUGHT IT/);
  assert.match(await page.textContent(".reveal"), /RECKLESS ADVICE/);
  assert.equal(await page.getAttribute(".reveal__stars", "aria-label"), "3 of 3 stars");
  await assertOnScreen(page, ".reveal .btn");
  await shot(page, size, "3-5-reveal-caught");
  const result = { errors, longtasks: await page.evaluate(() => window.__longtasks) };
  await ctx.close();
  return result;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const results = [];
  let failed = false;
  const runs = [];
  for (const size of SIZES) {
    runs.push([`${size.name}/fooled`, size, fooledPath], [`${size.name}/caught`, size, caughtPath]);
    runs.push([`${size.name}/level3-fooled`, size, fooledPath3], [`${size.name}/level3-caught`, size, caughtPath3]);
  }
  runs.push(["laptop/perfect", SIZES[0], perfectPath], ["small/landscape", SMALL, smallLandscape]);
  try {
    for (const [label, size, run] of runs) {
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
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
  }
  process.exit(failed ? 1 : 0);
})();
