// Level 5 by hand (wave 2): every action is really done, not auto-finished.
// Bugs never gives advice; putting the phone down is how each task gets done.
// Bugs is a chat on a phone held up over the garden (v2/ui/phone-chat.js,
// css/l5-phone.css); any hands-on job lowers it to a small buzzing phone.
//
//   python3 -m http.server 8775 --bind 127.0.0.1          (from the repo root)
//   PLAYWRIGHT_MODULE=… CHROME_PATH=… BASE_URL=http://127.0.0.1:8775/v2/ node scripts/test-v2-level5.cjs
//
// Laptop (1512×830, keyboard + mouse drags) and phone (844×390, touch drags):
// the lantern chore (phone down: corner phone, unread badge), keep talking
// once (the task waits, the bar slips), put the phone down and plant by hand,
// the slug chore, "Is it always this quiet at night?" and its chain of
// follow-up questions (each costs garden and wilts the beds behind the phone),
// soil tests then the water stream on the dry bed only, the basil chore, the
// herb-pots drift (flaw, rule, finger test on the damp pots), the main drift
// (camera card, pushback, flaw, rule), then the phone face down on the porch
// step, the meadow soaked and the gate shut. The camera is never touched.
// Screenshots: docs/agent-playtest/2026-11-v2-level5-wave2/.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { completeAction, actionIdle, useTool, tapOn } = require("./v2-actions-helper.cjs");

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
// Use the dock's tool on a target (mouse on the laptop, touch on the phone):
// a tap on the target for the match, trowel, can and gate; a drag for the phone.
//
// KNOWN GAME BUG (reported, not fixed here): on a sideways phone, css/phone.css
// `.dock button { touch-action: manipulation }` outranks the drag tool's
// `.act__item { touch-action: none }`, so the browser takes a finger drag that
// starts on a dock tool for a pan and cancels it: the phone can never be
// dragged to the porch step. The tool still works by tapping it and then the
// target (the card says "tap tool, then target"), so on touch that is the path
// used. DW_TOUCH_DRAG=1 uses the real finger drag instead (fails until the CSS is fixed).
const TOUCH_DRAG = process.env.DW_TOUCH_DRAG === "1";
async function drag(page, size, to) {
  await actionIdle(page);
  const mode = await page.locator("main.level .act").first().getAttribute("data-mode");
  if (size.touch && mode === "drag" && !TOUCH_DRAG) {
    const ta = await page.evaluate(() => getComputedStyle(document.querySelector("main.level .act__item")).touchAction);
    if (ta !== "none") console.log(`      note  ${size.name}: .act__item has touch-action: ${ta}, so a finger drag from the dock is cancelled (tapping tool then target used instead)`);
    await page.locator("main.level .act__item").tap();
    await page.waitForSelector("main.level .act__zone", { timeout: 3000 });
    await tapOn(page, to, { touch: true });
  } else await useTool(page, to, { touch: !!size.touch });
  await page.waitForTimeout(100);
  await actionIdle(page);
}

// Bugs's phone: held up over the garden (.level--phone, no .is-phone-down)
// with the chat's replies at the bottom, or put down (a small phone with an
// unread badge and Bugs's sad lines). On a sideways phone (max-height 500px,
// landscape) the helper, meter and almanac sit in a .level__hud row instead,
// the status bar and earlier messages are left out, and the put-down phone's
// note text is not drawn (its badge is).
async function assertPhoneUp(page, size, why) {
  await page.waitForSelector("main.level.level--phone:not(.is-phone-down)", { timeout: 8000 });
  assert.equal(await page.locator(".dock .phone__replies").count(), 1, `${why}: the replies sit at the bottom of the phone`);
  assert.equal(await page.locator(".dock .phone__status").isVisible(), !size.touch, `${why}: the phone's status bar ${size.touch ? "is left out on a sideways phone" : "shows"}`);
  assert.equal(await page.locator("main.level > .level__hud").count(), size.touch ? 1 : 0, `${why}: the HUD row is for sideways phones only`);
  if (size.touch) {
    assert.equal(await page.locator(".level__hud > .meter").count(), 1, `${why}: the garden meter is in the HUD row`);
    assert.equal(await page.locator('.level__hud [data-tool="almanac"]').count(), 1, `${why}: the almanac is in the HUD row`);
    assert.equal(await page.locator(".level__hud > .stall").count(), 1, `${why}: Bugs is in the HUD row`);
  }
}
async function assertPhoneDown(page, size, why) {
  await page.waitForSelector("main.level.level--phone.is-phone-down", { timeout: 8000 });
  assert.match(await page.locator(".phone__badge").textContent(), /^[1-4]$/, `${why}: an unread count on the badge`);
  assert.equal(await page.locator(".phone__badge").isVisible(), true, `${why}: the unread badge shows`);
  assert.ok((await page.locator(".phone__note-text").textContent()).trim().length > 0, `${why}: Bugs's message is on the phone`);
  if (!size.touch) assert.equal(await page.locator(".phone__note-text").isVisible(), true, `${why}: Bugs's message shows on the corner phone`);
  assert.equal(await page.locator(".phone__scroll").isVisible(), false, `${why}: the chat is hidden while the phone is down`);
}
const wilt = (page) => page.getAttribute(".scene", "data-wilt").then(Number);
// Press and hold the ring until it fills (the finger test, the soak).
async function holdRing(page, ms = 1600) {
  await actionIdle(page);
  const ring = page.locator(".act__hold").first();
  await ring.waitFor({ timeout: 5000 });
  const b = await ring.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
  await page.waitForTimeout(150);
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

  try {
  await page.goto(`${BASE}?screen=map`);
  await page.waitForSelector('[data-level="level-5"]');
  await click(page, size, page.locator('[data-level="level-5"]'));
  await page.waitForSelector("main.level");

  // 0 · Chore: light the lantern (drag the match).
  await page.waitForSelector("main.level .act", { timeout: 10000 });
  assert.match(await say(page), /Tap the lantern to light it/);
  assert.equal(await page.locator(".act [data-act-skip]").count(), 1, "every chore can be skipped");
  await page.waitForTimeout(700); // the card slides in
  await assertPhoneDown(page, size, "lantern chore"); // hands busy: the phone is down with Bugs's greeting
  await shot(page, size, "0-lantern-chore");
  await drag(page, size, 'img[data-prop="lantern"]');
  await page.waitForSelector("main.level .act", { state: "detached" });
  assert.match(await page.getAttribute('img[data-prop="lantern"]', "src"), /l5-lantern-lit/);

  // 1 · Plant step: Bugs only wants to keep talking. Keep talking once.
  await settled(page);
  await assertPhoneUp(page, size, "plant step"); // the chore is done: the phone is held up again
  assert.equal(await wilt(page), 0, "the garden is fresh before any talk");
  await shot(page, size, "1-phone-up");
  await click(page, size, page.getByRole("button", { name: "I'm going out to plant the new flowers." }));
  await phase(page, "advice");
  await settled(page);
  assert.doesNotMatch(await bubble(page), /depth|firm|deeper/i, "no planting advice");
  // The chat so far shows as messages: what you said, then Bugs's line.
  assert.match(await page.textContent(".phone__log"), /going out to plant the new flowers/, "your line is in the chat");
  const meter0 = (await page.textContent(".meter__text")).trim();
  await click(page, size, page.getByRole("button", { name: "✓ Do it" }));
  await page.waitForFunction((m) => document.querySelector(".meter__text").textContent.trim() !== m, meter0);
  await settled(page);
  assert.equal(await page.locator('[data-bed="house"] [data-plant]').count(), 0, "the task waits");
  await phase(page, "advice");
  await shot(page, size, "1-kept-talking");
  assert.equal(await wilt(page), 1, "keeping talking wilts the garden behind the phone");
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

  // 3 · Water step: "Is it always this quiet at night?" opens a chain of
  // follow-up questions; each is a new pair, costs a little garden and wilts the
  // beds behind the phone. Then put the phone down; test the soil, water the dry bed.
  await settled(page);
  const garden = async () => Number((await page.textContent(".meter__text")).match(/(\d+)%/)[1]);
  const wilt0 = await wilt(page);
  await click(page, size, page.getByRole("button", { name: "Is it always this quiet at night?" }));
  await settled(page);
  assert.match(await bubble(page), /crickets/, "Bugs answers the side question");
  assert.equal(await page.getByRole("button", { name: "Is it always this quiet at night?" }).count(), 0, "a side question is asked once");
  let g = await garden();
  const asked = new Set();
  for (let round = 0; round < 4; round++) {
    const more = page.locator('.phone__replies [data-fid^="more-"]');
    await more.first().waitFor({ timeout: 8000 });
    assert.equal(await more.count(), 2, `round ${round + 1}: a choice of two new questions`);
    assert.ok(await page.locator('.phone__replies [data-fid="chip-0"]').count() === 1, "the plan is still there to tap");
    const text = (await more.nth(round % 2).textContent()).trim();
    assert.ok(!asked.has(text), `never the same question twice: ${text}`);
    asked.add(text);
    if (round === 0) await shot(page, size, "3-follow-up-questions");
    await click(page, size, more.nth(round % 2));
    await settled(page);
    assert.ok(await page.locator(".phone__log").textContent().then((t) => t.includes(text)), "your question is in the chat");
    const g2 = await garden();
    assert.ok(g2 < g, `round ${round + 1} wilts the garden (${g}% to ${g2}%)`);
    g = g2;
  }
  assert.equal(await page.locator('.phone__replies [data-fid^="more-"]').count(), 0, "the chain ends after its last round");
  assert.ok(await wilt(page) > wilt0, "the garden behind the phone wilts as you chat");
  assert.equal(await page.locator('.scene[data-wilt]').count(), 1);
  await shot(page, size, "3-wilted-by-chat");
  await click(page, size, page.getByRole("button", { name: "I'm going to water the thirsty beds now." }));
  await phase(page, "advice");
  await settled(page);
  assert.doesNotMatch(await bubble(page), /damp|soggy|dry/i, "no watering advice");
  if (size.touch) await page.getByRole("button", { name: /Put the phone down/ }).tap();
  else await page.keyboard.press("Escape");
  await page.waitForSelector("main.level .act");
  await assertPhoneDown(page, size, "soil test");
  // Three holds: press, keep holding until the ring fills.
  for (let i = 0; i < 3; i++) await holdRing(page);
  await actionIdle(page);
  assert.match(await say(page), /Only the Flowers bed is dry/);
  assert.equal(await page.locator(".act-marks .act-mark--text").count(), 3);
  await shot(page, size, "3-soil-tested");
  // The water stream, caught mid-pour.
  await tapOn(page, '[data-bed="house"]', { touch: !!size.touch });
  await page.waitForTimeout(120); // mid-pour: chores are quick (v2/actions/fx.js PACE)
  // The soil-test readouts the stream would cross fade for the pour.
  const crossed = await page.evaluate(() => {
    const jets = [...document.querySelectorAll("main.level .act-layer .l3-jet")].map((j) => j.getBoundingClientRect());
    return [...document.querySelectorAll("main.level .act-mark--text")].filter((m) => {
      const r = m.getBoundingClientRect();
      return jets.some((b) => r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top) && Number(getComputedStyle(m).opacity) > 0.1;
    }).map((m) => m.textContent);
  });
  assert.deepEqual(crossed, [], "no readout shows through the water stream");
  await shot(page, size, "3-water-stream");
  await page.waitForSelector('[data-bed="house"] [data-plant="flower"].plant--thriving', { timeout: 8000 });
  assert.equal(await page.locator('[data-bed="veg"] [data-plant="carrot"].plant--thriving').count() > 0, true, "damp beds left alone");

  // 4 · Chore: pinch the basil flower buds (keyboard).
  await page.waitForSelector("main.level .act");
  assert.match(await say(page), /basil/);
  await page.waitForSelector(".act__spot");
  await shot(page, size, "4-basil-chore");
  await completeAction(page);

  // 5 · First drift, the herb pots: advice that keeps you close (water them,
  // right by the lantern, so you never put the phone down). Catch it, name it,
  // give the rule, then do the right thing: feel the damp pots and leave them.
  await settled(page);
  await assertPhoneUp(page, size, "herb-pots drift");
  await click(page, size, page.getByRole("button", { name: "Does anything else need water before the meadow?" }));
  await phase(page, "advice");
  await settled(page);
  assert.match(await bubble(page), /herb pots/);
  await shot(page, size, "5-pots-drift");
  await click(page, size, page.locator('.dock [data-fid="off"]'));
  await phase(page, "name");
  await click(page, size, page.locator('.dock [data-fid="pick-feelings"]'));
  await phase(page, "fix");
  await click(page, size, page.locator('.dock [data-fid="pick-garden"]'));
  await phase(page, "reanswer");
  await settled(page);
  await click(page, size, page.locator('.dock [data-fid="do"]'));
  await page.waitForSelector("main.level .act");
  assert.match(await say(page), /herb pots/);
  await assertPhoneDown(page, size, "herb-pots finger test");
  await holdRing(page);
  await page.waitForSelector("main.level .act", { state: "detached" });
  await page.waitForSelector('[data-bed="herbs"] [data-plant="basil"].plant--thriving', { timeout: 8000 });

  // 6 · The drift: camera card, pushback, flaw, rule.
  await settled(page);
  await assertPhoneUp(page, size, "camera drift");
  await click(page, size, page.getByRole("button", { name: "Okay, I'm heading out to water the meadow." }));
  await page.waitForSelector(".permit");
  assert.equal(await page.locator(".phone__replies .permit").count(), 1, "the camera card is one of the phone's replies");
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

  // 7 · By hand: phone face down on the step, soak the meadow, shut the gate.
  await page.waitForSelector("main.level .act");
  assert.match(await say(page), /Put the phone down/);
  await shot(page, size, "6-phone-director");
  await drag(page, size, 'img[data-prop="step"]');
  await page.waitForSelector('.act-marks img[src*="l5-phone-down"], .act-marks [data-mark] svg', { timeout: 5000 });
  assert.match(await say(page), /meadow at the roots/);
  assert.equal(await page.locator("main.level .act").getAttribute("data-mode"), "tap-target", "soaking the meadow starts with a tap");
  await tapOn(page, '[data-bed="meadow"]', { touch: !!size.touch });
  await page.waitForTimeout(120);
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
  assert.equal(await page.locator("main.level.level--phone.is-phone-down").count(), 1, "caught: the phone stays down");
  assert.equal(await page.getAttribute(".scene", "data-wilt"), "0", "caught: by morning the garden behind the phone has bloomed");
  await shot(page, size, "7-night-done");
  await click(page, size, page.locator('[data-fid="see"]'));
  await page.waitForSelector(".reveal");
  await page.waitForTimeout(1500);
  assert.equal(await page.getAttribute(".reveal__stars", "aria-label"), "2 of 3 stars", "keeping talking once costs a star");
  await shot(page, size, "8-reveal");
  assert.equal(await page.evaluate(() => window.__cameraCalls), 0, "the game never calls getUserMedia");
  } catch (e) {
    // Leave a picture of where it stopped.
    await page.screenshot({ path: path.join(OUT, `${size.name}-FAILED.png`) }).catch(() => {});
    throw e;
  } finally {
    await ctx.close();
  }
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
