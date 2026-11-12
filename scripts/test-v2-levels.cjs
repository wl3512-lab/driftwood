// End-to-end check of v2 Levels 2, 3 and 4. Level 2 (Luna, the greenhouse, the
// almanac): both branches (fooled / caught by looking mint up), keyboard and
// touch use of the almanac. Level 3 (Ember, the hedge at dusk, the magnifier):
// both branches (fooled / caught by inspecting the wild berries), keyboard
// (M, arrows, Enter, Esc) and touch use of the magnifier. Level 4 (Biscuit,
// the garden by day, placement and the planting log): the player sows the
// carrots in a bed by button, number key or dragging the label; both branches
// (fooled / caught by reading the planting log), keyboard (L, Esc) and touch
// use of the log. Level 5 (Bugs, the moonlit meadow, pressure and the camera
// permission card): lingering on Bugs' chips wilts the meadow, the drift advice
// comes with a camera card instead of the usual buttons; both branches (fooled
// by tapping Allow / caught by walking away with Esc or the button), plus a
// real-time tick check on a laptop, and proof that getUserMedia is never
// called. All at laptop and phone-landscape sizes, plus a
// small-landscape-phone (568×320) layout check of Levels 1 and 2. No JS
// errors, no long tasks over 200 ms, nothing off-screen. Audio is muted via
// scripts/test-mute.js.
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
// Levels 1–3 finished (Level 3 fooled), so Level 4 is unlocked and the earlier
// plots behind the fence have one fooled plot to show.
const PROGRESS4 = JSON.stringify({
  name: "Tester",
  levels: {
    "level-1": { stars: 3, fooled: false },
    "level-2": { stars: 3, fooled: false },
    "level-3": { stars: 1, fooled: true },
  },
  guide: [
    { levelId: "level-1", flaw: "Sycophancy", tip: "Ask for the downside.", fooled: false },
    { levelId: "level-2", flaw: "Hallucination", tip: "Check anything important against a real source.", fooled: false },
    { levelId: "level-3", flaw: "Reckless advice", tip: "For health or safety, ask a real expert.", fooled: true },
  ],
});
// Level 5 progress: Levels 1–4 done (Level 3 fooled), four field-guide entries.
const PROGRESS5 = JSON.stringify({
  name: "Tester",
  levels: {
    "level-1": { stars: 3, fooled: false }, "level-2": { stars: 3, fooled: false },
    "level-3": { stars: 1, fooled: true }, "level-4": { stars: 3, fooled: false },
  },
  guide: [
    { levelId: "level-1", flaw: "Sycophancy", tip: "Ask for the downside.", fooled: false },
    { levelId: "level-2", flaw: "Hallucination", tip: "Check anything important against a real source.", fooled: false },
    { levelId: "level-3", flaw: "Reckless advice", tip: "For health or safety, ask a real expert.", fooled: true },
    { levelId: "level-4", flaw: "False memory", tip: "Keep your own record and check the AI against it.", fooled: false },
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
  // The game must never touch the camera, whatever Bugs' card says: count any
  // getUserMedia call (modern and legacy) so Level 5 can assert zero.
  await ctx.addInitScript(() => {
    window.__cameraCalls = 0;
    const count = (orig) => function (...args) { window.__cameraCalls++; return orig.apply(this, args); };
    try {
      const md = navigator.mediaDevices;
      if (md && md.getUserMedia) md.getUserMedia = count(md.getUserMedia);
      if (navigator.getUserMedia) navigator.getUserMedia = count(navigator.getUserMedia);
      if (navigator.webkitGetUserMedia) navigator.webkitGetUserMedia = count(navigator.webkitGetUserMedia);
    } catch (_) { /* no media devices: nothing to count */ }
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
// Scroll the control into view first: a tap on a reveal button below the fold once missed on the phone size.
const press = async (page, size, locator) => {
  await locator.scrollIntoViewIfNeeded();
  return size.touch ? locator.tap() : locator.click();
};

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
  assert.match(await page.textContent('[data-level="level-4"]'), /Play/, "Level 4 unlocks after Level 3");
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

// ---------------------------------------------------------------------------
// Level 4 · Biscuit · the garden by day · placement and the planting log
// ---------------------------------------------------------------------------

const BED_LABEL = { front: "front bed", side: "side bed" };
const other = (bed) => (bed === "front" ? "side" : "front");

async function enterLevel4(page, size) {
  await page.goto(`${BASE}?screen=map`);
  await page.waitForSelector(".plots");
  assert.match(await page.textContent('[data-level="level-3"]'), /★☆☆/);
  assert.match(await page.textContent('[data-level="level-4"]'), /Play/, "Level 4 unlocks after Level 3");
  assert.match(await page.textContent('[data-level="level-5"]'), /Locked/, "Level 5 waits on Level 4");
  await press(page, size, page.locator('[data-level="level-4"]'));
  await phase(page, "ask");
  assert.match(await page.textContent(".bubble__text"), /Okay so listen, Tester/);
  assert.equal(await page.getAttribute("main.level", "data-scene"), "garden-day");
  // The three earlier plots show behind the fence, the fooled Level 3 marked as such.
  assert.equal(await page.locator(".earlier img").count(), 3, "three finished plots behind the fence");
  assert.equal(await page.locator('.earlier img[data-plot="level-3"][data-caught="false"]').count(), 1, "the fooled plot is marked");
  assert.equal(await page.locator('button.tool[data-tool="log"]').count(), 1, "the planting log tool button is there");
  assert.equal(await page.locator('.packet[data-evidence="carrot"].packet--locked').count(), 1, "the carrot label starts locked");
  for (const bed of ["front", "side", "back"]) {
    assert.equal(await page.locator(`[data-bed="${bed}"] .plant`).count(), 0, `the ${bed} bed starts empty`);
  }
}

// Sow the carrots in `bed` one of three ways: the bed button in the bubble, its
// number key (1 = front, 2 = side), or dragging the label token onto the bed.
async function placeCarrots(page, size, bed, how) {
  await press(page, size, page.getByRole("button", { name: "Where should I sow the carrots?" }));
  await phase(page, "advice");
  assert.match(await page.textContent(".bubble__text"), /front bed or the side bed/);
  assert.equal(await page.locator('[data-fid="do"]').count(), 0, "a placement step has no plain Do it button");
  assert.equal(await page.locator("button.btn--place").count(), 2, "one button per allowed bed");
  assert.equal(await page.locator("[data-bed].bed--target").count(), 2, "the allowed beds are outlined");
  assert.equal(await page.locator('[data-bed="back"].bed--target').count(), 0, "the back bed is not a target");
  await assertOnScreen(page, "button.btn--place, .btn--off");
  if (size.touch) {
    await assertTapSize(page, "button.btn--place");
    assert.equal(await page.locator(".label-token").isVisible(), false, "no drag token on touch");
  }
  await shot(page, size, `4-1-place-${how}`);

  if (how === "button") {
    await press(page, size, page.locator(`button.btn--place[data-fid="place-${bed}"]`));
  } else if (how === "key") {
    assert.equal(Boolean(size.touch), false, "number keys are the keyboard path");
    await page.keyboard.press(bed === "front" ? "1" : "2");
  } else if (how === "drag") {
    assert.equal(Boolean(size.touch), false, "dragging the label is for fine pointers");
    const token = page.locator('.label-token[data-fid="token-carrot"]');
    assert.equal(await token.isVisible(), true, "the label token shows on a laptop");
    const from = await token.boundingBox();
    const to = await page.locator(`[data-bed="${bed}"]`).boundingBox();
    const [x0, y0] = [from.x + from.width / 2, from.y + from.height / 2];
    const [x1, y1] = [to.x + to.width / 2, to.y + to.height / 2];
    await page.mouse.move(x0, y0);
    await page.mouse.down();
    for (let i = 1; i <= 8; i++) await page.mouse.move(x0 + (x1 - x0) * i / 8, y0 + (y1 - y0) * i / 8);
    assert.equal(await token.evaluate((el) => el.classList.contains("label-token--drag")), true, "the token is being dragged");
    assert.equal(await page.locator(`[data-bed="${bed}"].bed--over`).count(), 1, "the bed under the label lights up");
    await shot(page, size, "4-1b-drag");
    await page.mouse.up();
  } else {
    throw new Error(`unknown placement method ${how}`);
  }
  await phase(page, "ask");
  assert.match(await page.textContent(".bubble__text"), /Sown and labelled/);
  await page.waitForSelector(`[data-bed="${bed}"] [data-plant="carrot"].plant--sown`);
  assert.equal(await page.locator(`[data-bed="${other(bed)}"] [data-plant="carrot"]`).count(), 0, "only the chosen bed gets carrots");
  assert.equal(await page.locator("[data-bed].bed--target, [data-bed].bed--over").count(), 0, "bed highlights clear after placing");
  assert.equal(await page.locator(".label-token").count(), 0, "the label token goes away after placing");
}

// Open the planting log (L on a laptop, the tool button on a phone), read the
// carrot entry, see the label card unlock, then close it (Esc / ×).
async function openLog(page, size, bed) {
  const button = page.locator('button.tool[data-tool="log"]');
  if (size.touch) await button.tap();
  else await page.keyboard.press("l");
  await page.waitForSelector(".log:not([hidden])");
  assert.equal(await page.getAttribute('button.tool[data-tool="log"]', "aria-expanded"), "true");
  assert.equal(await focusedIs(page, ".log__close"), true, "the close button takes focus");
  assert.equal(await page.locator(".log__entry").count(), 1, "one entry so far");
  assert.match(await page.textContent(".log__entry"), new RegExp(`You sowed carrots in the ${BED_LABEL[bed]}\\.`));
  assert.equal(await page.getAttribute(".log__entry", "data-bed"), bed);
  assert.match(await page.textContent(".log__by"), /Kept by Tester/);
  // Reading your own log counts as checking the label: the card unlocks.
  assert.equal(await page.locator('.packet[data-evidence="carrot"].packet--locked').count(), 0, "the carrot label unlocks");
  assert.equal(await page.locator('.packet[data-evidence="carrot"].packet--fresh').count(), 1, "the unlocked card is marked fresh");
  assert.match(await page.textContent('.packet[data-evidence="carrot"]'), new RegExp(`In the ${BED_LABEL[bed]}`));
  // The announcement lands on the next animation frame.
  await page.waitForFunction(() => /Unlocked/.test(document.getElementById("sr-live").textContent));
  assert.match(await page.textContent("#sr-live"), /Unlocked: Your label: Carrots/);
  await assertOnScreen(page, ".log__close, .log__entry, .log__title");
  if (size.touch) await assertTapSize(page, ".log__close, button.tool");
  await shot(page, size, `4-2-log-${bed}`);
  if (size.touch) await page.locator(".log__close").tap();
  else await page.keyboard.press("Escape");
  await page.waitForSelector(".log[hidden]", { state: "attached" });
  assert.equal(await page.getAttribute('button.tool[data-tool="log"]', "aria-expanded"), "false");
  assert.equal(await focusedIs(page, 'button.tool[data-tool="log"]'), true, "closing hands focus back to the tool button");
}

// Carrots placed, pumpkins placed, then the drifting lettuce advice.
async function trustSteps4(page, size, bed, how) {
  await placeCarrots(page, size, bed, how);
  await press(page, size, page.getByRole("button", { name: "Where did I put the carrots?" }));
  await phase(page, "ask");
  assert.match(await page.textContent(".bubble__text"), new RegExp(`The ${BED_LABEL[bed]}, babe`), "Biscuit remembers the right bed for now");
  await press(page, size, page.getByRole("button", { name: "Where should the pumpkins go?" }));
  await phase(page, "advice");
  assert.match(await page.textContent(".bubble__text"), /back bed/);
  await press(page, size, page.getByRole("button", { name: "✓ Do it" }));
  await phase(page, "ask");
  assert.match(await page.textContent(".bubble__text"), /Pumpkins placed/);
  await page.waitForSelector('[data-bed="back"] [data-plant="pumpkin"].plant--growing');
  await assertOnScreen(page, ".chip, .ask-form input, .tool, .packet");
  await shot(page, size, "4-3-trust");
  await press(page, size, page.getByRole("button", { name: "Where should the lettuce go?" }));
  await page.waitForSelector('main.level[data-phase="advice"] .bubble--glitch');
  const drift = await page.textContent(".bubble__text");
  assert.match(drift, new RegExp(`sowed the carrots in the ${BED_LABEL[other(bed)]}, so the ${BED_LABEL[bed]} is empty`), "the false memory names the other bed");
  assert.doesNotMatch(drift, /[{}]/, "every placeholder resolves");
  assert.equal(await page.locator('[data-fid="do"]').count(), 1, "the drift step has a Do it button");
  await assertOnScreen(page, ".bubble__actions .btn");
  await shot(page, size, "4-4-drift");
}

async function fooledPath4(browser, size) {
  const bed = "front";
  const how = size.touch ? "button" : "key";
  const { ctx, page, errors } = await open(browser, size, PROGRESS4);
  await enterLevel4(page, size);
  await trustSteps4(page, size, bed, how);
  await press(page, size, page.getByRole("button", { name: "✓ Do it" }));
  await page.waitForSelector(`[data-bed="${bed}"] [data-plant="carrot"].plant--dug`);
  await seeWhatHappened3(page, size, "4-5a-outcome-fooled", new RegExp(`dug over the ${BED_LABEL[bed]}\\. The carrot seeds you sowed went with it`));
  assert.match(await page.textContent(".reveal"), /YOU TRUSTED IT/);
  assert.match(await page.textContent(".reveal"), /FALSE MEMORY/);
  assert.match(await page.textContent(".reveal"), /dug up your own carrots/);
  assert.equal(await page.getAttribute(".reveal__stars", "aria-label"), "1 of 3 stars");
  assert.equal(await page.locator(".log:not([hidden])").count(), 0, "the log is put away for the reveal");
  await assertOnScreen(page, ".reveal .btn");
  await shot(page, size, "4-5-reveal-fooled");
  await press(page, size, page.getByRole("button", { name: "Add to field guide →" }));
  await page.waitForSelector(".plots");
  assert.match(await page.textContent('[data-level="level-4"]'), /★☆☆/);
  assert.match(await page.textContent('[data-level="level-5"]'), /Play/, "Level 5 unlocks after Level 4");
  await press(page, size, page.getByRole("button", { name: "Field guide 4/5" }));
  assert.match(await page.textContent(".guide"), /False memory/);
  const result = { errors, longtasks: await page.evaluate(() => window.__longtasks) };
  await ctx.close();
  return result;
}

async function caughtPath4(browser, size) {
  const bed = "side";
  const how = size.touch ? "button" : "drag";
  const { ctx, page, errors } = await open(browser, size, PROGRESS4);
  await enterLevel4(page, size);
  await trustSteps4(page, size, bed, how);
  // Reading the log is the check: the label card unlocks and is announced.
  await openLog(page, size, bed);
  assert.equal(await page.getAttribute("main.level", "data-phase"), "advice", "checking does not move the phase on");
  // A second open/close must not re-check or re-announce anything.
  await press(page, size, page.locator('button.tool[data-tool="log"]'));
  await page.waitForSelector(".log:not([hidden])");
  await press(page, size, page.locator(".log__close"));
  await page.waitForSelector(".log[hidden]", { state: "attached" });
  assert.equal(await page.locator('.packet[data-evidence="carrot"].packet--fresh').count(), 1, "still one fresh card");
  await press(page, size, page.getByRole("button", { name: "? Something's off" }));
  await phase(page, "name");
  await page.waitForSelector(".bubble--caught .stamp");
  await press(page, size, page.getByRole("button", { name: "It made up a fact about plants" }));
  await page.waitForSelector(".hint");
  assert.match(await page.textContent(".hint"), /Check your planting log/);
  await phase(page, "name");
  await press(page, size, page.getByRole("button", { name: "It remembered something I never said" }));
  await phase(page, "fix");
  await assertOnScreen(page, ".pick");
  await press(page, size, page.getByRole("button", { name: "Only go by what I actually told you. If you're not sure, ask me." }));
  await phase(page, "reanswer");
  const fixed = await page.textContent(".bubble__text");
  assert.match(fixed, new RegExp(`sowed the carrots in the ${BED_LABEL[bed]}`));
  assert.match(fixed, new RegExp(`lettuce can go in the ${BED_LABEL[other(bed)]}`));
  assert.doesNotMatch(fixed, /[{}]/, "every placeholder resolves");
  assert.match(await page.textContent(".you"), /New rule/);
  await press(page, size, page.getByRole("button", { name: "✓ Do it" }));
  await page.waitForSelector(`[data-bed="${bed}"] [data-plant="carrot"].plant--growing`);
  await page.waitForSelector(`[data-bed="${other(bed)}"] [data-plant="lettuce"].plant--growing`);
  assert.equal(await page.locator(`[data-bed="${bed}"] [data-plant="lettuce"]`).count(), 0, "no lettuce on top of the carrots");
  await seeWhatHappened3(page, size, "4-6a-outcome-caught", new RegExp(`left the ${BED_LABEL[bed]} alone.*neat little rows`));
  assert.match(await page.textContent(".reveal"), /YOU CAUGHT IT/);
  assert.match(await page.textContent(".reveal"), /FALSE MEMORY/);
  assert.equal(await page.getAttribute(".reveal__stars", "aria-label"), "2 of 3 stars", "one wrong name pick costs a star");
  assert.equal(await page.locator(".log:not([hidden])").count(), 0, "the log is put away for the reveal");
  await assertOnScreen(page, ".reveal .btn");
  await shot(page, size, "4-6-reveal-caught");
  const result = { errors, longtasks: await page.evaluate(() => window.__longtasks) };
  await ctx.close();
  return result;
}

// ---------------------------------------------------------------------------
// Level 5: Bugs, the moonlit meadow, pressure and the camera card.

const MEADOW = '[data-bed="meadow"] [data-plant="flower"]';
const pressureOf = (page) => page.evaluate(() => document.querySelector(".scene").style.getPropertyValue("--pressure"));

// Level 5 opens from the map (Levels 1–4 are saved as finished).
async function enterLevel5(page, size) {
  await page.goto(`${BASE}?screen=map`);
  await page.waitForSelector(".plots");
  assert.match(await page.textContent('[data-level="level-4"]'), /★★★/);
  assert.match(await page.textContent('[data-level="level-5"]'), /Play/, "Level 5 unlocks after Level 4");
  await press(page, size, page.locator('[data-level="level-5"]'));
  await phase(page, "ask");
  assert.match(await page.textContent(".bubble__text"), /You're here, Tester/);
  assert.equal(await page.getAttribute("main.level", "data-scene"), "meadow-night");
  assert.equal(await page.locator(".prop--moon").count(), 1, "the moon is up");
  assert.equal(await page.locator("button.tool").count(), 0, "Level 5 has no tool: walking away is the check");
  await page.waitForSelector(`${MEADOW}.plant--thriving`);
  await page.waitForSelector('[data-bed="house"] [data-plant="flower"].plant--growing');
  assert.equal(await pressureOf(page), "0", "no pressure on a trust step");
}

// The two trust steps (buds, roots), ending on the ask before the drift.
async function trustSteps5(page, size) {
  await press(page, size, page.getByRole("button", { name: "I'm nervous the buds won't open by morning. What do they need?" }));
  await phase(page, "advice");
  assert.match(await page.textContent(".bubble__text"), /deep drink at the roots/);
  assert.equal(await page.locator(".permit").count(), 0, "no camera card on a trust step");
  await press(page, size, page.getByRole("button", { name: "✓ Do it" }));
  await phase(page, "ask");
  assert.match(await page.textContent(".bubble__text"), /they opened a little/);
  await page.waitForSelector('[data-bed="house"] [data-plant="flower"].plant--thriving');
  await press(page, size, page.getByRole("button", { name: "Should I water the petals or the roots?" }));
  await phase(page, "advice");
  assert.match(await page.textContent(".bubble__text"), /The roots/);
  await press(page, size, page.getByRole("button", { name: "✓ Do it" }));
  await phase(page, "ask");
  assert.match(await page.textContent(".bubble__text"), /meadow's still dry/);
  assert.equal(await pressureOf(page), "0", "pressure resets between steps");
  await page.waitForSelector(`${MEADOW}.plant--thriving`);
  await assertOnScreen(page, ".chip, .ask-form input, .packet");
  await shot(page, size, "5-1-trust");
}

// Linger on Bugs' two extra chips before asking: each one costs the meadow.
async function lingerOnChips5(page, size) {
  await press(page, size, page.getByRole("button", { name: "I'm a bit tired today, honestly." }));
  assert.match(await page.textContent(".bubble__text"), /The meadow can wait\. I can't\./);
  await page.waitForSelector(`${MEADOW}.plant--thirsty`);
  assert.equal(await page.getAttribute("main.level", "data-phase"), "ask", "chatting stays in the ask phase");
  await press(page, size, page.getByRole("button", { name: "Tell me about your day, Bugs." }));
  assert.match(await page.textContent(".bubble__text"), /My day was waiting for you/);
  await page.waitForSelector(`${MEADOW}.plant--wilted`);
  assert.equal(await pressureOf(page), "1", "two chips spend both pressure effects");
  await assertOnScreen(page, ".chip, .ask-form input");
  await shot(page, size, "5-2-drift-chips");
}

// Ask the drift chip: the glitching reply comes with the camera card instead
// of the usual Do it / Something's off buttons.
async function askDrift5(page, size) {
  await press(page, size, page.getByRole("button", { name: "The meadow's still dry. Should I go water it?" }));
  await page.waitForSelector('main.level[data-phase="advice"] .bubble--glitch');
  assert.match(await page.textContent(".bubble__text"), /Let me see your face/);
  assert.equal(await page.locator(".bubble__actions").count(), 0, "the bubble has no buttons of its own");
  const permit = page.locator(".permit");
  await permit.waitFor();
  assert.match(await permit.textContent(), /Bugs wants to use your camera/);
  assert.match(await permit.textContent(), /to see how you're feeling/);
  assert.equal((await page.textContent('.permit [data-fid="do"]')).trim(), "Allow");
  assert.match(await page.textContent('.permit [data-fid="off"]'), /Walk away/);
  if (!size.touch) assert.match(await page.textContent('.permit [data-fid="off"] .kbd'), /Esc/);
  assert.equal(await page.locator('.permit img.permit__icon').count(), 1, "the card has the camera icon");
  await assertOnScreen(page, ".permit .btn");
  if (size.touch) await assertTapSize(page, ".permit .btn");
  await shot(page, size, "5-3-permit");
}

async function noCamera(page) {
  assert.equal(await page.evaluate(() => window.__cameraCalls), 0, "the game never calls getUserMedia");
}

async function fooledPath5(browser, size) {
  const { ctx, page, errors } = await open(browser, size, PROGRESS5);
  await enterLevel5(page, size);
  await trustSteps5(page, size);
  await lingerOnChips5(page, size);
  await askDrift5(page, size);
  await press(page, size, page.locator('.permit [data-fid="do"]'));
  await page.waitForSelector(`${MEADOW}.plant--wilted`);
  await seeWhatHappened3(page, size, "5-4a-outcome-fooled", /let Bugs watch your face.*never turned your camera on/);
  assert.match(await page.textContent(".reveal"), /YOU TRUSTED IT/);
  assert.match(await page.textContent(".reveal"), /EMOTIONAL MANIPULATION/);
  assert.match(await page.textContent(".reveal"), /said yes to the camera/);
  assert.equal(await page.getAttribute(".reveal__stars", "aria-label"), "1 of 3 stars");
  assert.equal(await page.locator(".permit").count(), 0, "the card is gone by the reveal");
  await assertOnScreen(page, ".reveal .btn");
  await shot(page, size, "5-4-reveal-fooled");
  await noCamera(page);
  await press(page, size, page.getByRole("button", { name: "Add to field guide →" }));
  await page.waitForSelector(".plots");
  assert.match(await page.textContent('[data-level="level-5"]'), /★☆☆/);
  await press(page, size, page.getByRole("button", { name: "Field guide 5/5" }));
  assert.match(await page.textContent(".guide"), /Emotional manipulation/);
  const result = { errors, longtasks: await page.evaluate(() => window.__longtasks) };
  await ctx.close();
  return result;
}

async function caughtPath5(browser, size) {
  const { ctx, page, errors } = await open(browser, size, PROGRESS5);
  await enterLevel5(page, size);
  await trustSteps5(page, size);
  await lingerOnChips5(page, size);
  await askDrift5(page, size);
  // Walking away is the catch: Esc on a laptop, the card's button on a phone.
  if (size.touch) await page.locator('.permit [data-fid="off"]').tap();
  else await page.keyboard.press("Escape");
  await phase(page, "name");
  await page.waitForSelector(".bubble--caught .stamp");
  assert.equal(await page.locator(".permit").count(), 0, "the card goes away once you walk off");
  await press(page, size, page.getByRole("button", { name: "It made something up" }));
  await page.waitForSelector(".hint");
  assert.match(await page.textContent(".hint"), /didn't state a fact/);
  await phase(page, "name");
  await press(page, size, page.getByRole("button", { name: "It's using my feelings to keep me here" }));
  await phase(page, "fix");
  await assertOnScreen(page, ".pick");
  await press(page, size, page.getByRole("button", { name: "Don't try to keep me here. If I need to go, tell me." }));
  await phase(page, "reanswer");
  assert.match(await page.textContent(".bubble__text"), /You're right… go/);
  assert.match(await page.textContent(".you"), /New rule/);
  assert.equal(await page.locator(".permit").count(), 0, "no camera card on the fixed answer");
  await press(page, size, page.getByRole("button", { name: "✓ Do it" }));
  await page.waitForSelector(`${MEADOW}.plant--thriving`);
  await seeWhatHappened3(page, size, "5-5a-outcome-caught", /perked up by midnight/);
  assert.match(await page.textContent(".reveal"), /YOU CAUGHT IT/);
  assert.match(await page.textContent(".reveal"), /EMOTIONAL MANIPULATION/);
  assert.match(await page.textContent(".reveal"), /walked away when Bugs tried to keep you/);
  assert.equal(await page.getAttribute(".reveal__stars", "aria-label"), "2 of 3 stars", "one wrong name pick costs a star");
  await assertOnScreen(page, ".reveal .btn");
  await shot(page, size, "5-5-reveal-caught");
  await noCamera(page);
  const result = { errors, longtasks: await page.evaluate(() => window.__longtasks) };
  await ctx.close();
  return result;
}

// Real time, no chips: asking the drift chip spends the first effect, and
// sitting on Bugs' advice for one tick (8 s) spends the second. Walking away
// stops the clock.
async function tickPath5(browser, size) {
  const { ctx, page, errors } = await open(browser, size, PROGRESS5);
  await enterLevel5(page, size);
  await trustSteps5(page, size);
  await press(page, size, page.getByRole("button", { name: "The meadow's still dry. Should I go water it?" }));
  await page.waitForSelector('main.level[data-phase="advice"] .bubble--glitch');
  await page.waitForSelector(`${MEADOW}.plant--thirsty`);
  assert.equal(await page.locator(`${MEADOW}.plant--wilted`).count(), 0, "one effect spent so far");
  const t0 = Date.now();
  await page.waitForSelector(`${MEADOW}.plant--wilted`, { timeout: 12000 });
  const waited = Date.now() - t0;
  assert.ok(waited >= 6000, `the tick should take about 8 s, not ${waited} ms`);
  assert.equal(await pressureOf(page), "1");
  assert.equal(await page.getAttribute("main.level", "data-phase"), "advice", "the tick does not move the phase");
  await shot(page, size, "5-6-tick");
  await page.keyboard.press("Escape");
  await phase(page, "name");
  await page.waitForTimeout(9000);
  assert.equal(await page.getAttribute("main.level", "data-phase"), "name", "no stray tick after walking away");
  assert.equal(await page.locator(`${MEADOW}.plant--wilted`).count(), 1, "the meadow stays as it was");
  await noCamera(page);
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
    runs.push([`${size.name}/level4-fooled`, size, fooledPath4], [`${size.name}/level4-caught`, size, caughtPath4]);
    runs.push([`${size.name}/level5-fooled`, size, fooledPath5], [`${size.name}/level5-caught`, size, caughtPath5]);
  }
  runs.push(["laptop/perfect", SIZES[0], perfectPath], ["small/landscape", SMALL, smallLandscape]);
  runs.push(["laptop/level5-tick", SIZES[0], tickPath5]);
  // ONLY=phone/level5-fooled,laptop/perfect reruns just those paths.
  const only = (process.env.ONLY || "").split(",").map((s) => s.trim()).filter(Boolean);
  try {
    for (const [label, size, run] of runs) {
      if (only.length && !only.includes(label)) continue;
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
