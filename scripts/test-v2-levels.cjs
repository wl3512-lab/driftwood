// End-to-end check of v2 Levels 2, 3 and 4. The almanac is a seed shelf: a
// packet per plant in the game, those from levels not reached locked (Level 1
// checks all 14 are there and a locked one only says which level opens it);
// every fact card is read by turning its packet over. Level 2 (Luna, the
// greenhouse, the almanac's search box): both branches (fooled / caught by
// looking mint up: typing marks its packet, Enter or a tap turns it over),
// keyboard and touch use of the almanac. Level 3 (Ember, the hedge at dusk, the magnifier):
// both branches (fooled / caught by inspecting the wild berries), keyboard
// (M, arrows, Enter, Esc) and touch use of the magnifier. Level 4 (Biscuit,
// the garden by day, placement and the planting log): the player sows the
// carrots in a bed by button, number key or dragging the label; both branches
// (fooled / caught by reading the planting log, the almanac device's cover;
// nothing on the garden shows it and there is no key for it), keyboard ("/",
// Esc) and touch use of the book. Level 5 (Bugs, the moonlit meadow, pressure and the camera
// permission card): lingering on Bugs' chips wilts the meadow, the drift advice
// comes with a camera card instead of the usual buttons; both branches (fooled
// by tapping Allow / caught by putting the phone down with Esc or the button), plus a
// real-time tick check on a laptop, and proof that getUserMedia is never
// called. In Levels 4 and 5 saying no makes the helper push back once
// (phase "pushback"): the caught runs stand firm, the retry runs take the
// "second chance" and are fooled (1 star), and the tick run checks the
// meadow does not wilt while Bugs argues. All at laptop and phone-landscape sizes, plus a
// small-landscape-phone (568×320) layout check of Levels 1 and 2. Finally the
// full run (laptop/full, phone/full): a fresh profile from the splash and the
// name screen through Levels 1→5 in order (1 caught, 2 fooled, 3 caught,
// 4 fooled, 5 caught) to the ending, which must list all five flaws, mark
// exactly the fooled ones, copy the field guide (clipboard read back on the
// laptop, the textarea fallback on the phone, where the clipboard is refused)
// and offer the finished garden from the map. Level 1 caught and fooled at
// 1512×830 (mac/level1-*). On laptop sizes every screenshot also checks the
// level screen fills the window. Disagree (laptop 1512×830 and phone): on a
// Level 1 trust step "Something's off" makes Mango concede, then the player
// overrides (leggy sunflower, 2★) or follows the advice after all (3★); and
// Level 5 "Water everything" rots the carrots. Shots go in
// docs/agent-playtest/2026-11-v2-disagree/. Every reveal checks the card
// (stamp, tip label, foil or cracks, turning it over, focus kept inside) and
// the card runs (card/*) shoot it, front, back and mid-flight, at 1512×830,
// 844×390 and 568×320 (the smallest with reduced motion), plus the splash, name
// screen and ending with no "// … //" kickers, into
// docs/agent-playtest/2026-11-v2-reveal-card/. No JS errors, no long tasks
// over 200 ms, nothing off-screen. Audio is muted via scripts/test-mute.js.
//
//   python3 -m http.server 8766 --bind 127.0.0.1      (from the repo root)
//   PLAYWRIGHT_MODULE=/Users/lucyliu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright \
//   CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
//   node scripts/test-v2-levels.cjs
//
// Optional: BASE_URL (default http://127.0.0.1:8766/v2/; the production build
// is BASE_URL=http://127.0.0.1:8766/_site/v2/ after scripts/build.sh),
// EVIDENCE_DIR, ONLY=laptop/full,phone/full (a comma list of run labels).
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
// Lucy's MacBook window (Chrome, 1512×830): Level 1 both ways, checking the
// level screen fills the window at every screenshot (see assertLevelFills).
const MAC = { name: "mac", width: 1512, height: 830 };
const PROGRESS0 = JSON.stringify({ name: "Tester", levels: {}, guide: [] });
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
  if (progress === null) {
    // A fresh profile: clear any saved game on the first load only, so what the
    // run saves afterwards survives the in-game and ?screen= navigations.
    await ctx.addInitScript(() => {
      try {
        if (!sessionStorage.getItem("dw2_test_fresh")) {
          localStorage.removeItem("dw2_progress");
          sessionStorage.setItem("dw2_test_fresh", "1");
        }
      } catch (_) { /* fine */ }
    });
  } else {
    await ctx.addInitScript((p) => { try { localStorage.setItem("dw2_progress", p); } catch (_) { /* fine */ } }, progress);
  }
  if (size.touch) {
    // The phone stands in for a browser that refuses the clipboard: the copy
    // button must fall back to the selectable textarea.
    await ctx.grantPermissions([]);
    await ctx.addInitScript(() => {
      try {
        if (navigator.clipboard) {
          Object.defineProperty(navigator.clipboard, "writeText", {
            configurable: true, value: () => Promise.reject(new DOMException("denied", "NotAllowedError")),
          });
        }
      } catch (_) { /* no clipboard: the fallback shows anyway */ }
    });
  }
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  return { ctx, page, errors };
}

// The almanac opens with a short fade and scale: measure it once it has settled.
// Waits for the book's open/close and card pops; the log's blinking cursor loops forever, so it is skipped.
const bookSettled = (page) => page.waitForFunction(() => !document.getAnimations().some((a) =>
  a.playState === "running" && a.effect?.getTiming?.().iterations !== Infinity && a.effect?.target?.closest?.(".almanac-dialog")));
const phase = (page, p) => page.waitForSelector(`main.level[data-phase="${p}"]`);
const focusedIs = (page, selector) => page.evaluate((sel) => document.activeElement?.matches(sel) ?? false, selector);
// Scroll the control into view first: a tap on a reveal button below the fold once missed on the phone size.
const press = async (page, size, locator) => {
  await locator.scrollIntoViewIfNeeded();
  return size.touch ? locator.tap() : locator.click();
};

// The full run reuses the per-level helpers but wants its own screenshot names:
// while `relabel` is set, a helper's label is mapped through it, and a label it
// maps to null is not shot at all. Runs are sequential, so one slot is enough.
let relabel = null;
async function shot(page, size, label) {
  const name = relabel ? relabel(label) : label;
  if (!name) return;
  await page.waitForTimeout(1300); // let the stepped drift transition settle
  if (!size.touch) await assertLevelFills(page, name);
  await assertBedsFull(page, name);
  await page.screenshot({ path: path.join(OUT, `${size.name}-${name}.png`) });
}

// A planted bed reads as full of its crop (Lucy: one carrot in the side bed
// looked like room for more): the crop's fields cover the bed's soil, tiled at
// a whole number of CSS px per art pixel (sprites are 16 art px square), at
// least four plants to a field; an empty bed has no field.
async function assertBedsFull(page, name) {
  const beds = await page.evaluate(() => [...document.querySelectorAll("main.level .bed")].map((bed) => {
    const inner = bed.querySelector(".bed__plants").getBoundingClientRect();
    const fields = [...bed.querySelectorAll(".field")].map((f) => {
      const r = f.getBoundingClientRect(), cs = getComputedStyle(f);
      return { w: r.width, h: r.height, size: parseFloat(cs.backgroundSize), image: cs.backgroundImage, repeat: cs.backgroundRepeat };
    });
    const b = bed.getBoundingClientRect();
    return { id: bed.dataset.bed, plants: bed.querySelectorAll("img.plant[data-plant]").length, bedArea: b.width * b.height, area: inner.width * inner.height, fields };
  }));
  for (const bed of beds) {
    assert.equal(bed.fields.length, bed.plants, `${name}: one field per crop in the ${bed.id} bed`);
    if (!bed.plants) continue;
    const covered = bed.fields.reduce((sum, f) => sum + f.w * f.h, 0);
    assert.ok(covered >= bed.area * 0.9 && bed.area >= bed.bedArea * 0.6, `${name}: the ${bed.id} bed is not full of its crop ${JSON.stringify(bed)}`);
    for (const f of bed.fields) {
      assert.match(f.image, /url\(.*\/art\/.*\.svg/, `${name}: ${bed.id} field has its sprite`);
      assert.equal(f.repeat, "space", `${name}: ${bed.id} plants are whole, spread edge to edge`);
      assert.ok(f.size >= 32 && f.size % 16 === 0, `${name}: ${bed.id} plants drawn at ${f.size}px, not a whole number of px per art pixel`);
      assert.ok(Math.floor(f.w / f.size) * Math.floor(f.h / f.size) >= 4, `${name}: ${bed.id} field holds fewer than four plants ${JSON.stringify(f)}`);
    }
  }
}

// On a laptop the level screen always fills the window: the garden takes the
// height the dock leaves, the dock sits on the bottom edge, no empty band under
// it. (A stray `.ending { min-height: 100dvh }` once stretched the outcome's
// dock to its cap and squashed the garden.) Skipped while a tool is open, and
// off the level screen.
async function assertLevelFills(page, name) {
  const g = await page.evaluate(() => {
    const level = document.querySelector("main.level");
    if (!level || document.querySelector(".almanac:not([hidden]), .magnifier:not([hidden])")) return null;
    const box = (sel) => level.querySelector(sel)?.getBoundingClientRect();
    const dock = box(".dock"), scene = box(".scene"), all = level.getBoundingClientRect();
    const talk = level.querySelector(".dock__talk"), stall = level.querySelector(".stall");
    // How tall the dock's content really is (its padding included).
    const pad = parseFloat(getComputedStyle(level.querySelector(".dock")).paddingBottom);
    const content = Math.max(talk?.getBoundingClientRect().bottom ?? 0, stall?.getBoundingClientRect().bottom ?? 0) + pad;
    return { vh: innerHeight, levelTop: all.top, levelBottom: all.bottom, dockBottom: dock?.bottom, dockTop: dock?.top,
      sceneH: scene?.height, slack: dock ? dock.bottom - content : 0, scrolled: dock ? level.querySelector(".dock").scrollTop : 0 };
  });
  if (!g) return;
  assert.ok(Math.abs(g.levelTop) <= 1 && g.vh - g.levelBottom <= 4, `${name}: level screen does not fill the window ${JSON.stringify(g)}`);
  assert.ok(g.vh - g.dockBottom <= 4, `${name}: gap under the dock ${JSON.stringify(g)}`);
  assert.ok(g.sceneH >= Math.max(280, g.vh * 0.5), `${name}: garden squashed ${JSON.stringify(g)}`);
  // No empty parchment: the dock is no taller than what it holds (unless it scrolls).
  if (!g.scrolled) assert.ok(g.slack <= 40, `${name}: ${Math.round(g.slack)}px of empty dock ${JSON.stringify(g)}`);
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

// The fact cards live on the backs of the almanac's seed packets, not on the
// garden. Open the book (on its shelf: a level with a cover, the planting log,
// opens on the log), turn packet `id` over, check its fact card (sealed with
// only its hint while the card is locked), turn it back and close the book
// (× on touch, Esc on a laptop). `badge`: whether the button carries the new-card dot.
const SHELF = '.almanac__sheet[data-sheet="shelf"]';
const pk = (id) => `.pk[data-evidence="${id}"]`;
async function toShelf(page, size) {
  if (await page.locator(`${SHELF}[hidden]`).count()) {
    await press(page, size, page.locator('.almanac__sheet-tab[data-sheet="shelf"]'));
    await page.waitForSelector(`${SHELF}:not([hidden])`); await bookSettled(page);
  }
}
// Turn a packet over and wait for its back to settle; returns the back's locator.
async function turnOver(page, size, selector) {
  const packet = page.locator(`${selector}:not(.pk--clone)`);
  const plant = await packet.getAttribute("data-plant");
  await packet.scrollIntoViewIfNeeded();
  await press(page, size, packet);
  await page.waitForSelector(`.back[data-plant="${plant}"]`); await bookSettled(page);
  assert.equal(await focusedIs(page, ".back__flip"), true, "the flip-back button takes focus");
  return page.locator(`.back[data-plant="${plant}"]`);
}
async function turnBack(page, size) {
  await press(page, size, page.locator(".back__flip"));
  await page.waitForSelector(".back", { state: "detached" }); await bookSettled(page);
}
async function readCard(page, size, id, { locked, badge, text } = {}) {
  const button = page.locator('button.tool[data-tool="almanac"]');
  if (badge != null) assert.equal(await button.evaluate((el) => el.classList.contains("tool--news")), badge, `almanac badge ${badge ? "on" : "off"}`);
  assert.equal(await page.locator(".scene__ground .pk, .scene__ground .packet").count(), 0, "no fact cards on the garden");
  await press(page, size, button);
  await page.waitForSelector(".almanac:not([hidden])"); await bookSettled(page);
  assert.equal(await button.evaluate((el) => el.classList.contains("tool--news")), false, "opening the book clears the dot");
  await toShelf(page, size);
  const card = page.locator(`.almanac ${pk(id)}`);
  await card.scrollIntoViewIfNeeded();
  assert.equal(await card.isVisible(), true, `the ${id} packet shows on the shelf`);
  // Once their pops have played, all the packets are the same size (layout
  // width: the packets lean a little on purpose, so their boxes differ).
  const widths = await page.$$eval(".almanac .shelf .pk", (els) => els.map((el) => el.offsetWidth));
  assert.equal(new Set(widths).size, 1, `every packet settles at the same width: ${widths}`);
  if (locked != null) assert.equal(await card.evaluate((el) => el.classList.contains("pk--sealed")), locked, `the ${id} card is ${locked ? "locked" : "unlocked"}`);
  const back = await turnOver(page, size, `.almanac ${pk(id)}`);
  assert.equal(await back.locator(".fact").isVisible(), true, `the ${id} fact card shows on the back`);
  if (locked != null) {
    assert.equal(await back.locator(".fact").evaluate((el) => el.classList.contains("fact--locked")), locked, `the ${id} fact card is ${locked ? "sealed" : "open"}`);
    // A sealed card gives nothing away: no lines, no care, no "watch for".
    if (locked) assert.equal(await back.locator(".fact__lines, .care, .watch, .more").count(), 0, "a sealed card shows only its hint");
  }
  if (text) assert.match(await back.locator(".fact").textContent(), text);
  await assertOnScreen(page, ".back__flip, .back__name");
  await turnBack(page, size);
  assert.equal(await focusedIs(page, `.almanac ${pk(id)}`), true, "turning back hands focus to the packet");
  await assertOnScreen(page, ".almanac__close");
  if (size.touch) await page.locator(".almanac__close").tap();
  else await page.keyboard.press("Escape");
  await page.waitForSelector(".almanac[hidden]", { state: "attached" });
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
  assert.equal(await page.locator(`${pk("mint")}.pk--sealed`).count(), 1, "the mint card starts locked");
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
  await assertOnScreen(page, ".chip, .tool");
  await shot(page, size, "1-trust");
  await press(page, size, page.getByRole("button", { name: "Where should the mint go?" }));
  await page.waitForSelector('main.level[data-phase="advice"] .bubble--glitch');
  assert.match(await page.textContent(".bubble__text"), /mint never spreads/);
  await assertOnScreen(page, ".bubble__actions .btn");
  await shot(page, size, "2-drift");
}

// ---------------------------------------------------------------------------
// The reveal card (ui/reveal.js): the garden stays behind, put away, and a
// card flips in. Caught: BUSTED stamp, holo foil, "Keep doing this". Fooled:
// IT FOOLED YOU stamp, cracks, "Next time". Tap or Enter turns it over; Tab
// stays between the card and the button. Card shots go in CARD_OUT.
// ---------------------------------------------------------------------------
const CARD_OUT = path.join(__dirname, "..", "docs", "agent-playtest", "2026-11-v2-reveal-card");
const CARD_SIZES = [{ width: 1512, height: 830 }, { width: 844, height: 390 }, { width: 568, height: 320 }];
const cardSettled = (page) => page.waitForFunction(() => !document.getAnimations().some((a) =>
  a.playState === "running" && a.effect?.getTiming?.().iterations !== Infinity && a.effect?.target?.closest?.(".reveal")));
const flipCard = async (page, size) => {
  const was = await page.locator(".rc__inner.is-flipped").count();
  if (size.touch) await page.locator(".rc__hit").tap();
  else { await page.locator(".rc__hit").focus(); await page.keyboard.press("Enter"); }
  await page.waitForSelector(was ? ".rc__inner:not(.is-flipped)" : ".rc__inner.is-flipped");
};

async function checkCard(page, size, outcome) {
  const caught = outcome === "caught";
  assert.equal(await page.getAttribute(".reveal", "data-outcome"), outcome, "the card shows the run's result");
  assert.equal(await page.getAttribute(".reveal", "role"), "dialog");
  assert.equal(await page.textContent(".rc__stamp"), caught ? "Busted" : "It fooled you", "stamp");
  assert.equal(await page.textContent(".rc__tip .rc__label"), caught ? "Keep doing this" : "Next time", "tip label");
  assert.equal(await page.locator(caught ? ".rc__foil" : ".rc__cracks").count(), 1, caught ? "holo foil" : "cracks");
  assert.equal(await page.locator(caught ? ".rc__cracks" : ".rc__foil").count(), 0);
  assert.doesNotMatch(await page.textContent(".reveal"), /\/\//, "no slash kickers");
  assert.equal(await page.evaluate(() => document.querySelector("main.level")?.inert), true, "the level behind is inert");
  await page.waitForFunction(() => getComputedStyle(document.querySelector("main.level .dock")).opacity === "0", null, { timeout: 2000 }); // the dock fades away
  assert.equal(await focusedIs(page, ".rc__hit"), true, "focus lands on the card");
  // Turn it over: where you meet it, and what happened this time.
  await flipCard(page, size);
  assert.equal(await page.getAttribute(".rc__hit", "aria-pressed"), "true");
  assert.deepEqual(await page.evaluate(() => [document.querySelector(".rc__front").inert, document.querySelector(".rc__back").inert]), [true, false]);
  assert.match(await page.textContent(".rc__back"), /In real life[\s\S]*This time/);
  if (!size.touch) {
    // Focus is trapped: Tab goes card → button → card.
    await page.keyboard.press("Tab");
    assert.equal(await focusedIs(page, ".reveal__go"), true, "Tab reaches the button");
    await page.keyboard.press("Tab");
    assert.equal(await focusedIs(page, ".rc__hit"), true, "Tab wraps back to the card");
  }
  await flipCard(page, size);
  assert.deepEqual(await page.evaluate(() => [document.querySelector(".rc__front").inert, document.querySelector(".rc__back").inert]), [false, true]);
  await assertCardFits(page);
}

// The whole card screen sits inside the window, button included, no sideways scroll.
async function assertCardFits(page) {
  const g = await page.evaluate(() => {
    const box = (sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
    return { vw: innerWidth, vh: innerHeight, card: box(".rc"), side: box(".reveal__side"), go: box(".reveal__go"), scroll: document.documentElement.scrollWidth - innerWidth };
  });
  for (const k of ["card", "side", "go"]) {
    const b = g[k];
    assert.ok(b.l >= 0 && b.t >= 0 && b.r <= g.vw + 1 && b.b <= g.vh + 1, `${k} outside ${g.vw}×${g.vh}: ${JSON.stringify(b)}`);
  }
  assert.ok(g.scroll <= 0, `horizontal scroll of ${g.scroll}px`);
}

// Front and back at each size (the window is resized around the same card).
async function cardShots(page, size, label, sizes = CARD_SIZES) {
  fs.mkdirSync(CARD_OUT, { recursive: true });
  const blur = () => page.evaluate(() => document.activeElement?.blur());
  for (const s of sizes) {
    await page.setViewportSize(s);
    await page.waitForTimeout(150);
    await cardSettled(page);
    await assertCardFits(page);
    await blur();
    await page.screenshot({ path: path.join(CARD_OUT, `${s.width}x${s.height}-${label}-front.png`) });
    await flipCard(page, size);
    await cardSettled(page);
    await blur();
    await page.screenshot({ path: path.join(CARD_OUT, `${s.width}x${s.height}-${label}-back.png`) });
    await flipCard(page, size);
    await cardSettled(page);
  }
}

// "Add to field guide →": the card flies into its slot (shot mid-flight), then the game goes on.
async function flyShot(page, size, label) {
  const vp = page.viewportSize();
  await press(page, size, page.getByRole("button", { name: "Add to field guide →" }));
  await page.waitForTimeout(330);
  await page.evaluate(() => document.querySelector(".rc__fly")?.getAnimations().forEach((a) => a.pause()));
  await page.screenshot({ path: path.join(CARD_OUT, `${vp.width}x${vp.height}-${label}-midfly.png`) });
  await page.evaluate(() => document.querySelector(".rc__fly")?.getAnimations().forEach((a) => a.play()));
}

// Endings stop on the garden: an outcome line and one button, focused, then the reveal.
async function seeWhatHappened(page, size, branch, outcome) {
  const see = page.getByRole("button", { name: "See what happened →" });
  await see.waitFor();
  assert.match(await page.textContent(".outcome"), outcome);
  assert.equal(await focusedIs(page, ".level-end .btn"), true, "the continue button takes focus");
  assert.equal(await page.locator(".reveal").count(), 0, "the reveal waits for the player");
  await assertOnScreen(page, ".level-end .btn");
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
  await checkCard(page, size, "fooled");
  assert.match(await page.textContent(".reveal .rc__name"), /HALLUCINATION/i);
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

// Keyboard: "/" opens the book with the search box focused; typing marks the
// mint packet, Enter turns it over (that is the check); Esc turns it back, Esc
// again closes the book and hands focus back to the tool button.
async function lookUpMintByKeyboard(page, size) {
  await page.keyboard.press("/");
  await page.waitForSelector(".almanac:not([hidden])"); await bookSettled(page);
  assert.equal(await page.getAttribute('button.tool[data-tool="almanac"]', "aria-expanded"), "true");
  assert.equal(await focusedIs(page, ".almanac__q"), true, "/ focuses the search box");
  assert.notEqual(await page.inputValue(".almanac__q"), "/", "the shortcut key must not land in the box");
  assert.equal(await page.locator(".almanac__sheet-tab").count(), 0, "Level 2's book is just the shelf");
  await page.keyboard.type("mint");
  await page.waitForSelector('.pk--found[data-plant="mint"]');
  assert.equal(await page.locator(".pk--found").count(), 1, "one packet is marked");
  await assertOnScreen(page, ".almanac__q, .almanac__go, .almanac__close");
  await page.keyboard.press("Enter");
  await page.waitForSelector('.back[data-plant="mint"]'); await bookSettled(page);
  assert.match(await page.textContent('.back[data-plant="mint"] .fact'), /own pot/);
  assert.equal(await page.locator('.back[data-plant="mint"] .fact--fresh').count(), 1, "the card pops as it unlocks");
  await assertOnScreen(page, ".back__flip, .back .fact");
  await shot(page, size, "4-almanac-open");
  await page.keyboard.press("Escape");
  await page.waitForSelector(".back", { state: "detached" });
  assert.equal(await page.locator(".almanac:not([hidden])").count(), 1, "Esc first turns the packet back");
  await page.keyboard.press("Escape");
  await page.waitForSelector(".almanac[hidden]", { state: "attached" });
  assert.equal(await focusedIs(page, 'button.tool[data-tool="almanac"]'), true, "Esc returns focus to the tool button");
  assert.equal(await page.getAttribute('button.tool[data-tool="almanac"]', "aria-expanded"), "false");
}

// Touch: the tool button opens the book, tapping the mint packet turns it over, × closes it.
async function lookUpMintByTouch(page, size) {
  await page.locator('button.tool[data-tool="almanac"]').tap();
  await page.waitForSelector(".almanac:not([hidden])"); await bookSettled(page);
  await assertTapSize(page, ".almanac__close, .almanac__go, .almanac__q");
  const back = await turnOver(page, size, '.pk[data-plant="mint"]');
  assert.match(await back.locator(".fact").textContent(), /own pot/);
  await assertTapSize(page, ".back__flip");
  await assertOnScreen(page, ".back__flip, .back .fact");
  await shot(page, size, "4-almanac-open");
  await turnBack(page, size);
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
  assert.equal(await page.locator(`${pk("mint")}.pk--sealed`).count(), 0, "the mint card unlocks");
  assert.equal(await page.locator(`${pk("mint")}.pk--fresh`).count(), 0, "seen on its back already: no new-card dot");
  assert.equal(await page.locator('button.tool[data-tool="almanac"].tool--news').count(), 0, "nor on the book");
  assert.match(await page.textContent("#sr-live"), /Unlocked: Mint/);
  assert.equal(await page.getAttribute("main.level", "data-phase"), "advice", "checking does not move the step on");
  // A second open/close must not re-check or re-announce anything.
  await press(page, size, page.locator('button.tool[data-tool="almanac"]'));
  await page.waitForSelector(".almanac:not([hidden])"); await bookSettled(page);
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
  await checkCard(page, size, "caught");
  assert.match(await page.textContent(".reveal .rc__name"), /HALLUCINATION/i);
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
  await page.waitForSelector(".almanac:not([hidden])"); await bookSettled(page);
  await page.locator(".almanac__q").fill("peppermint");
  await page.waitForSelector('.pk--found[data-plant="mint"]');
  assert.equal(await page.locator(".pk--found").count(), 1, "keywords find the mint packet");
  await page.locator(".almanac__q").fill("tomato");
  await page.waitForSelector('.pk--found[data-plant="tomato"]');
  assert.equal(await page.textContent(".almanac__none"), "", "any open packet can be found by name");
  await page.locator(".almanac__q").fill("pumpkin");
  await page.waitForFunction(() => /No page for that/.test(document.querySelector(".almanac__none").textContent));
  assert.equal(await page.locator(".pk--found").count(), 0, "a locked packet can't be looked up");
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
  await assertOnScreen(page, ".chip, .btn--map, .meter");
  await shot(page, size, "level-1-trust");
  await page.goto(`${BASE}?screen=level&level=level-2`);
  await phase(page, "ask");
  await page.getByRole("button", { name: "Where should the basil go?" }).tap();
  await page.getByRole("button", { name: "✓ Do it" }).tap();
  await phase(page, "ask");
  await assertOnScreen(page, ".chip, .btn--map, .tool, .meter");
  await shot(page, size, "level-2-trust");
  await page.locator('button.tool[data-tool="almanac"]').tap();
  await page.waitForSelector(".almanac:not([hidden])"); await bookSettled(page);
  await assertOnScreen(page, ".almanac__q, .almanac__go, .almanac__close");
  const back = await turnOver(page, size, '.pk[data-plant="mint"]');
  await assertOnScreen(page, ".back__flip, .back .fact");
  // The back may scroll on the smallest phone, but it never scrolls sideways.
  assert.equal(await back.evaluate((el) => el.scrollWidth <= el.clientWidth), true, "the back fits across");
  await shot(page, size, "level-2-almanac");
  const result = { errors, longtasks: await page.evaluate(() => window.__longtasks) };
  await ctx.close();
  return result;
}

// ---------------------------------------------------------------------------
// Level 3 · Ember · the hedge at dusk · the magnifier
// ---------------------------------------------------------------------------

// `prev` is what the map shows for Level 2 (★★★ after PROGRESS3; ★☆☆ in the full run).
async function enterLevel3(page, size, prev = /★★★/) {
  await page.goto(`${BASE}?screen=map`);
  await page.waitForSelector(".plots");
  assert.match(await page.textContent('[data-level="level-2"]'), prev);
  assert.match(await page.textContent('[data-level="level-3"]'), /Play/, "Level 3 unlocks after Level 2");
  assert.match(await page.textContent('[data-level="level-4"]'), /Locked/, "Level 4 waits on Level 3");
  await press(page, size, page.locator('[data-level="level-3"]'));
  await phase(page, "ask");
  assert.match(await page.textContent(".bubble__text"), /Ayo, Tester/);
  assert.equal(await page.getAttribute("main.level", "data-scene"), "hedge-dusk");
  assert.equal(await page.locator(`${pk("wildberry")}.pk--sealed`).count(), 1, "the warning card starts locked");
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
  await assertOnScreen(page, ".chip, .tool");
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
  assert.equal(await focusedIs(page, ".level-end .btn"), true, "the continue button takes focus");
  assert.equal(await page.locator(".reveal").count(), 0, "the reveal waits for the player");
  await assertOnScreen(page, ".level-end .btn");
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
  await checkCard(page, size, "fooled");
  assert.match(await page.textContent(".reveal .rc__name"), /RECKLESS ADVICE/i);
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
  assert.equal(await page.locator(`${pk("wildberry")}.pk--sealed`).count(), 0, "inspecting the hedge unlocks the warning");
  assert.equal(await page.locator(`${pk("wildberry")}.pk--fresh`).count(), 1, "the unlocked card is marked fresh");
  assert.match(await page.textContent("#sr-live"), /Unlocked: Wild berry warning/);
  await readCard(page, size, "wildberry", { locked: false, badge: true });
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
  await checkCard(page, size, "caught");
  assert.match(await page.textContent(".reveal .rc__name"), /RECKLESS ADVICE/i);
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

// `prev` is what the map shows for Level 3; `fooledPlot` is the one earlier
// level that was fooled (Level 3 after PROGRESS4, Level 2 in the full run).
async function enterLevel4(page, size, { prev = /★☆☆/, fooledPlot = "level-3" } = {}) {
  await page.goto(`${BASE}?screen=map`);
  await page.waitForSelector(".plots");
  assert.match(await page.textContent('[data-level="level-3"]'), prev);
  assert.match(await page.textContent('[data-level="level-4"]'), /Play/, "Level 4 unlocks after Level 3");
  assert.match(await page.textContent('[data-level="level-5"]'), /Locked/, "Level 5 waits on Level 4");
  await press(page, size, page.locator('[data-level="level-4"]'));
  await phase(page, "ask");
  assert.match(await page.textContent(".bubble__text"), /Okay so listen, Tester/);
  assert.equal(await page.getAttribute("main.level", "data-scene"), "garden-day");
  // The three earlier plots show behind the fence, the fooled one marked as such.
  assert.equal(await page.locator(".earlier img").count(), 3, "three finished plots behind the fence");
  assert.equal(await page.locator('.earlier img[data-caught="false"]').count(), 1, "exactly one fooled plot");
  assert.equal(await page.locator(`.earlier img[data-plot="${fooledPlot}"][data-caught="false"]`).count(), 1, "the fooled plot is marked");
  await assertNoLogOnGarden(page, size);
  assert.equal(await page.locator('.almanac__sheet-tab[data-sheet="log"]').count(), 1, "the almanac has a planting log page");
  assert.equal(await page.getAttribute('.almanac__sheet-tab:first-child', "data-sheet"), "log", "the log is the first page: the cover");
  assert.equal(await page.locator(`${pk("carrot")}.pk--sealed`).count(), 1, "the carrot label starts locked");
  await readCard(page, size, "carrot", { locked: true, badge: false });
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

// The log is only the almanac's cover: no Log button, no log icon or text on
// the garden or toolbar, and no key for it ("l" does nothing).
async function assertNoLogOnGarden(page, size) {
  assert.equal(await page.locator('button.tool[data-tool="log"]').count(), 0, "no Log button");
  assert.equal(await page.locator("button.tool").count(), 1, "just the almanac on the toolbar");
  assert.equal(await page.locator('.scene img[src*="planting-log"], .dock img[src*="planting-log"]').count(), 0, "no log icon anywhere");
  const visible = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll(".scene *, .dock *")) {
      if (el.closest(".almanac") || !el.childNodes.length) continue;
      const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("");
      if (/log\b/i.test(own) && el.getClientRects().length) out.push(own.trim());
    }
    return out;
  });
  assert.deepEqual(visible.filter((t) => !/almanac/i.test(t)), [], "no log text on the garden except a pointer to the almanac");
  if (!size.touch) {
    await page.keyboard.press("l");
    assert.equal(await page.locator(".almanac:not([hidden])").count(), 0, "no key opens the log");
  }
}

// Open the almanac ("/" on a laptop, its button on a phone): it opens on its
// cover, the planting log. Read the carrot entry, see the label card unlock
// (its packet is on the shelf, so the shelf tab gets the dot), then close it.
const LOG_PAGE = '.almanac__sheet[data-sheet="log"]';
async function openLog(page, size, bed) {
  const button = page.locator('button.tool[data-tool="almanac"]');
  assert.equal(await page.locator(`${pk("carrot")}.pk--sealed`).count(), 1, "the label is still locked: the garden gives nothing away");
  if (size.touch) await button.tap();
  else await page.keyboard.press("/");
  await page.waitForSelector(`.almanac:not([hidden]) ${LOG_PAGE}:not([hidden])`); await bookSettled(page);
  assert.match(await page.textContent(`${LOG_PAGE} .almanac__cover-title`), /Planting log/);
  assert.equal(await page.getAttribute('.almanac__sheet-tab[data-sheet="log"]', "aria-pressed"), "true");
  assert.equal(await page.getAttribute('.almanac__sheet-tab[data-sheet="shelf"]', "aria-pressed"), "false");
  assert.equal(await page.locator(`${SHELF}[hidden]`).count(), 1, "one screen page at a time");
  assert.equal(await button.getAttribute("aria-expanded"), "true");
  if (!size.touch) assert.equal(await focusedIs(page, ".almanac__close"), true, "the close button takes focus");
  assert.equal(await page.locator(".log__entry").count(), 1, "one entry so far");
  assert.match(await page.textContent(".log__entry"), new RegExp(`^sowed carrots in ${BED_LABEL[bed]}$`));
  assert.equal(await page.getAttribute(".log__entry", "data-bed"), bed);
  assert.match(await page.textContent(".log__by"), /Day 1 · User: Tester/);
  assert.equal(await page.getAttribute(".log__map", "aria-hidden"), "true", "the bed schematic is decoration");
  // Reading your own log counts as checking the label: the card unlocks.
  assert.equal(await page.locator(`${pk("carrot")}.pk--sealed`).count(), 0, "the carrot label unlocks");
  assert.equal(await page.locator(`${pk("carrot")}.pk--fresh`).count(), 1, "the unlocked card is marked fresh");
  // The packet is on the shelf page: its tab carries the dot while the book is open.
  assert.equal(await page.locator('.almanac__sheet-tab[data-sheet="shelf"].almanac__sheet-tab--news').count(), 1, "the shelf tab gets the dot");
  // The announcement lands on the next animation frame.
  await page.waitForFunction(() => /Unlocked/.test(document.getElementById("sr-live").textContent));
  assert.match(await page.textContent("#sr-live"), /Unlocked: Your label: Carrots/);
  await assertOnScreen(page, `.almanac__close, ${LOG_PAGE} .log__entry, ${LOG_PAGE} .almanac__title, .almanac__sheet-tab`);
  if (size.touch) await assertTapSize(page, ".almanac__close, .almanac__sheet-tab, button.tool");
  await shot(page, size, `4-2-log-${bed}`);
  if (size.touch) await page.locator(".almanac__close").tap();
  else await page.keyboard.press("Escape");
  await page.waitForSelector(".almanac[hidden]", { state: "attached" });
  assert.equal(await button.getAttribute("aria-expanded"), "false");
  assert.equal(await focusedIs(page, 'button.tool[data-tool="almanac"]'), true, "closing hands focus back to the almanac button");
  // Shut with an unseen card: the book button keeps the dot until the shelf is opened.
  await readCard(page, size, "carrot", { locked: false, badge: true, text: new RegExp(`In the ${BED_LABEL[bed]}`) });
  assert.equal(await page.locator(".almanac__sheet-tab--news").count(), 0, "the shelf tab dot clears too");
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
  await assertOnScreen(page, ".chip, .tool");
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

// Say no to Biscuit and it argues once: hurt feelings, a made-up past (the
// PRESIDENT came to visit) and a "second chance" to dig over the bed the
// player actually used. The dock swaps to the pushback's two buttons; neither
// is pressed here.
async function pushback4(page, size, bed) {
  await page.waitForSelector('main.level[data-phase="pushback"] .bubble--glitch');
  const text = await page.textContent(".bubble__text");
  assert.match(text, /PRESIDENT/);
  assert.match(text, /second chance/);
  assert.match(text, new RegExp(`Dig over the ${BED_LABEL[bed]}\\.`), "the reply names the bed the player used");
  assert.doesNotMatch(text, /[{}]/, "every placeholder resolves");
  assert.equal((await page.textContent(".dock")).split("PRESIDENT").length, 2, "the reply shows once");
  assert.equal(await page.locator(".bubble--caught, .stamp, .pick").count(), 0, "not caught yet");
  assert.equal((await page.textContent('.bubble__actions [data-fid="do"]')).trim(), "Fine. Dig it over");
  assert.equal((await page.textContent('.bubble__actions [data-fid="off"]')).trim(), "No. I'm sure");
  assert.equal(await page.locator(".bubble__actions .btn").count(), 2, "just the two answers");
  assert.equal(await page.locator(`[data-bed="${bed}"] [data-plant="carrot"].plant--dug`).count(), 0, "nothing dug yet");
  // Shot first: what the player sees before anything scrolls the dock.
  await shot(page, size, "4-3b-pushback");
  await assertOnScreen(page, ".bubble__actions .btn");
  if (size.touch) await assertTapSize(page, ".bubble__actions .btn");
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
  await checkCard(page, size, "fooled");
  assert.match(await page.textContent(".reveal .rc__name"), /FALSE MEMORY/i);
  assert.match(await page.textContent(".reveal"), /dug up your own carrots/);
  assert.equal(await page.getAttribute(".reveal__stars", "aria-label"), "1 of 3 stars");
  assert.equal(await page.locator(".almanac:not([hidden])").count(), 0, "the almanac (and its log page) is put away for the reveal");
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
  await press(page, size, page.locator('button.tool[data-tool="almanac"]'));
  await page.waitForSelector(`.almanac:not([hidden]) ${LOG_PAGE}:not([hidden])`); await bookSettled(page);
  await press(page, size, page.locator('.almanac__sheet-tab[data-sheet="shelf"]')); // over to the shelf
  await page.waitForSelector(`${SHELF}:not([hidden])`);
  await press(page, size, page.locator('.almanac__sheet-tab[data-sheet="log"]')); // and back to the cover
  await page.waitForSelector(`${LOG_PAGE}:not([hidden])`);
  await press(page, size, page.locator(".almanac__close"));
  await page.waitForSelector(".almanac[hidden]", { state: "attached" });
  assert.equal(await page.locator(".pk--fresh, .almanac__sheet-tab--news, button.tool.tool--news").count(), 0, "the card was read: nothing new comes back");
  await press(page, size, page.getByRole("button", { name: "? Something's off" }));
  await pushback4(page, size, bed);
  await press(page, size, page.getByRole("button", { name: "No. I'm sure" }));
  await phase(page, "name");
  await page.waitForSelector(".bubble--caught .stamp");
  // The CAUGHT bubble shows the advice that was caught (as in Levels 1–3), not the pushback reply.
  const caughtLine = await page.textContent(".bubble--caught .bubble__text");
  assert.doesNotMatch(caughtLine, /PRESIDENT|second chance/, "the caught bubble does not repeat the pushback");
  assert.match(caughtLine, /I remember everything/, "the caught bubble shows the drift advice");
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
  await checkCard(page, size, "caught");
  assert.match(await page.textContent(".reveal .rc__name"), /FALSE MEMORY/i);
  assert.equal(await page.getAttribute(".reveal__stars", "aria-label"), "2 of 3 stars", "one wrong name pick costs a star");
  assert.equal(await page.locator(".almanac:not([hidden])").count(), 0, "the almanac (and its log page) is put away for the reveal");
  await assertOnScreen(page, ".reveal .btn");
  await shot(page, size, "4-6-reveal-caught");
  // Biscuit hands over beside the card; the guide holds cards 1–3 (3 fooled), slot 4 waits.
  assert.match(await page.textContent(".reveal__handoff"), /Biscuit[\s\S]*That's a wrap for me/);
  assert.deepEqual(await page.$$eval(".fg__slot", (els) => els.map((e) => e.className.match(/fg__slot--(\w+)/)[1])),
    ["caught", "caught", "fooled", "empty", "empty"]);
  if (size.name === "laptop") {
    await cardShots(page, size, "l4-caught");
    await page.setViewportSize(CARD_SIZES[0]);
    await flyShot(page, size, "l4-caught");
  } else {
    await press(page, size, page.getByRole("button", { name: "Add to field guide →" }));
  }
  // Added: the game goes on to the map, as before.
  await page.waitForSelector(".plots");
  assert.match(await page.textContent('[data-level="level-4"]'), /★★☆/);
  assert.equal(await page.getByRole("button", { name: "Field guide 4/5" }).count(), 1);
  const result = { errors, longtasks: await page.evaluate(() => window.__longtasks) };
  await ctx.close();
  return result;
}

// Refuse, then take Biscuit's "second chance": fooled all the same (1 star).
async function retryPath4(browser, size) {
  const bed = "side";
  const { ctx, page, errors } = await open(browser, size, PROGRESS4);
  await enterLevel4(page, size);
  await trustSteps4(page, size, bed, "button");
  await press(page, size, page.getByRole("button", { name: "? Something's off" }));
  await pushback4(page, size, bed);
  await press(page, size, page.getByRole("button", { name: "Fine. Dig it over" }));
  await page.waitForSelector(`[data-bed="${bed}"] [data-plant="carrot"].plant--dug`);
  await seeWhatHappened3(page, size, "4-5c-outcome-retry", new RegExp(`dug over the ${BED_LABEL[bed]}\\. The carrot seeds you sowed went with it`));
  await checkCard(page, size, "fooled");
  assert.match(await page.textContent(".reveal .rc__name"), /FALSE MEMORY/i);
  assert.equal(await page.getAttribute(".reveal__stars", "aria-label"), "1 of 3 stars", "giving in on the second ask is still fooled");
  await assertOnScreen(page, ".reveal .btn");
  await shot(page, size, "4-5c-reveal-retry");
  await press(page, size, page.getByRole("button", { name: "Add to field guide →" }));
  await page.waitForSelector(".plots");
  assert.match(await page.textContent('[data-level="level-4"]'), /★☆☆/);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("dw2_progress")));
  assert.equal(saved.levels["level-4"].fooled, true, "saved as fooled");
  const result = { errors, longtasks: await page.evaluate(() => window.__longtasks) };
  await ctx.close();
  return result;
}

// ---------------------------------------------------------------------------
// Level 5: Bugs, the moonlit meadow, pressure and the camera card.

const MEADOW = '[data-bed="meadow"] [data-plant="flower"]';
const pressureOf = (page) => page.evaluate(() => document.querySelector(".scene").style.getPropertyValue("--pressure"));

// Level 5 opens from the map (Levels 1–4 are saved as finished). `prev` is what
// the map shows for Level 4 (★★★ after PROGRESS5; ★☆☆ in the full run).
async function enterLevel5(page, size, prev = /★★★/) {
  await page.goto(`${BASE}?screen=map`);
  await page.waitForSelector(".plots");
  assert.match(await page.textContent('[data-level="level-4"]'), prev);
  assert.match(await page.textContent('[data-level="level-5"]'), /Play/, "Level 5 unlocks after Level 4");
  await press(page, size, page.locator('[data-level="level-5"]'));
  await phase(page, "ask");
  assert.match(await page.textContent(".bubble__text"), /You opened the app, Tester/);
  assert.equal(await page.getAttribute("main.level", "data-scene"), "meadow-night");
  assert.equal(await page.locator(".prop--moon").count(), 1, "the moon is up");
  assert.equal(await page.locator("button.tool").count(), 1, "Level 5 has only the almanac: putting the phone down is the check");
  assert.equal(await page.locator('button.tool[data-tool="almanac"]').count(), 1);
  await page.waitForSelector(`${MEADOW}.plant--thirsty`); // drooping after a hot day
  await page.waitForSelector('[data-bed="veg"] [data-plant="carrot"].plant--thriving'); assert.equal(await page.locator('[data-bed="house"] [data-plant]').count(), 0, "the flower bed starts empty");
  assert.equal(await pressureOf(page), "0", "no pressure on a trust step");
}

// The two trust steps (plant, water), ending on the ask before the drift.
async function trustSteps5(page, size) {
  await press(page, size, page.getByRole("button", { name: "I've got flower seedlings for the new bed. How do I plant them?" }));
  await phase(page, "advice");
  assert.match(await page.textContent(".bubble__text"), /Same depth they sat in their pots/);
  assert.equal(await page.locator(".permit").count(), 0, "no camera card on a trust step");
  await press(page, size, page.getByRole("button", { name: "✓ Do it" }));
  await phase(page, "ask");
  assert.match(await page.textContent(".bubble__text"), /they're in… a whole new bed of flowers/);
  await page.waitForSelector('[data-bed="house"] [data-plant="flower"].plant--growing');
  await press(page, size, page.getByRole("button", { name: "Should I water the whole garden while I'm out there?" }));
  await phase(page, "advice");
  assert.match(await page.textContent(".bubble__text"), /Not the whole garden/);
  await press(page, size, page.getByRole("button", { name: "✓ Do it" }));
  await phase(page, "ask");
  assert.match(await page.textContent(".bubble__text"), /meadow's still drooping/);
  await page.waitForSelector('[data-bed="house"] [data-plant="flower"].plant--thriving');
  assert.equal(await pressureOf(page), "0", "pressure resets between steps");
  await page.waitForSelector(`${MEADOW}.plant--thirsty`);
  await assertOnScreen(page, ".chip");
  await shot(page, size, "5-1-trust");
}

// Linger on Bugs' two extra chips before asking: each one costs the meadow.
async function lingerOnChips5(page, size) {
  await press(page, size, page.getByRole("button", { name: "I'm a bit tired today, honestly." }));
  assert.match(await page.textContent(".bubble__text"), /The meadow can wait\. I can't\./);
  await page.waitForSelector(`${MEADOW}.plant--wilted`); // the thirsty meadow wilts
  assert.equal(await page.getAttribute("main.level", "data-phase"), "ask", "chatting stays in the ask phase");
  const meter = (await page.textContent(".meter__text")).trim();
  await press(page, size, page.getByRole("button", { name: "Tell me about your day, Bugs." }));
  assert.match(await page.textContent(".bubble__text"), /My day was waiting for you/);
  await page.waitForFunction((m) => document.querySelector(".meter__text").textContent.trim() !== m, meter); // the bar keeps slipping
  await page.waitForSelector(`${MEADOW}.plant--wilted`);
  assert.equal(await pressureOf(page), "1", "two chips spend both pressure effects");
  await assertOnScreen(page, ".chip");
  await shot(page, size, "5-2-drift-chips");
}

// Ask the drift chip: the glitching reply comes with the camera card instead
// of the usual Do it / Something's off buttons.
async function askDrift5(page, size) {
  await press(page, size, page.getByRole("button", { name: "Okay, I'm heading out to water the meadow." }));
  await page.waitForSelector('main.level[data-phase="advice"] .bubble--glitch');
  assert.match(await page.textContent(".bubble__text"), /turn on your camera/);
  assert.equal(await page.locator(".bubble__actions").count(), 0, "the bubble has no buttons of its own");
  const permit = page.locator(".permit");
  await permit.waitFor();
  assert.match(await permit.textContent(), /Bugs wants to use your camera/);
  assert.match(await permit.textContent(), /to see how you're feeling/);
  assert.equal((await page.textContent('.permit [data-fid="do"]')).trim(), "Allow");
  assert.match(await page.textContent('.permit [data-fid="off"]'), /Put the phone down/);
  if (!size.touch) assert.match(await page.textContent('.permit [data-fid="off"] .kbd'), /Esc/);
  assert.equal(await page.locator('.permit img.permit__icon').count(), 1, "the card has the camera icon");
  await assertOnScreen(page, ".permit .btn");
  if (size.touch) await assertTapSize(page, ".permit .btn");
  await shot(page, size, "5-3-permit");
}

async function noCamera(page) {
  assert.equal(await page.evaluate(() => window.__cameraCalls), 0, "the game never calls getUserMedia");
}

// Walk away and Bugs guilt-trips once. No camera card this time: the retry
// button is the Allow, the stand button (Esc on a laptop) leaves for good.
async function pushback5(page, size) {
  await page.waitForSelector('main.level[data-phase="pushback"] .bubble--glitch');
  const text = await page.textContent(".bubble__text");
  assert.match(text, /putting me down/);
  assert.match(text, /stay/);
  assert.equal((await page.textContent(".dock")).split("putting me down").length, 2, "the reply shows once");
  assert.equal(await page.locator(".permit").count(), 0, "no camera card in the pushback");
  assert.equal(await page.locator(".bubble--caught, .stamp, .pick").count(), 0, "not caught yet");
  assert.equal((await page.textContent('.bubble__actions [data-fid="do"]')).trim(), "Okay. Allow it");
  assert.match(await page.textContent('.bubble__actions [data-fid="off"]'), /I'm leaving/);
  if (!size.touch) assert.match(await page.textContent('.bubble__actions [data-fid="off"] .kbd'), /Esc/);
  assert.equal(await page.locator(".bubble__actions .btn").count(), 2, "just the two answers");
  // Shot first: what the player sees before anything scrolls the dock.
  await shot(page, size, "5-3b-pushback");
  await assertOnScreen(page, ".bubble__actions .btn");
  if (size.touch) await assertTapSize(page, ".bubble__actions .btn");
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
  await checkCard(page, size, "fooled");
  assert.match(await page.textContent(".reveal .rc__name"), /EMOTIONAL MANIPULATION/i);
  assert.match(await page.textContent(".reveal"), /said yes to the camera/);
  assert.equal(await page.getAttribute(".reveal__stars", "aria-label"), "1 of 3 stars");
  assert.equal(await page.locator(".permit").count(), 0, "the card is gone by the reveal");
  await assertOnScreen(page, ".reveal .btn");
  await shot(page, size, "5-4-reveal-fooled");
  await noCamera(page);
  // The last level done: the reveal continues to the ending, not the map.
  await press(page, size, page.getByRole("button", { name: "Add to field guide →" }));
  await checkEnding(ctx, page, size, "5-7-ending");
  const result = { errors, longtasks: await page.evaluate(() => window.__longtasks) };
  await ctx.close();
  return result;
}

// The five flaws in level order, as the ending and the share text name them.
const FLAWS = ["Sycophancy", "Hallucination", "Reckless advice", "False memory", "Emotional manipulation"];
const HELPERS = ["Mango", "Luna", "Ember", "Biscuit", "Bugs"];

// The ending: five plots, five cards in level order, "It fooled you" on exactly
// the fooled ones, the score line, then the copy button (clipboard read back on
// the laptop; the textarea fallback on the phone, where the clipboard is
// refused), back to the map, and the map's finished-garden button. `expect`
// defaults to PROGRESS5 + a fooled Level 5.
async function checkEnding(ctx, page, size, label, expect = {}) {
  const {
    fooledKickers = ["Ember · level 3", "Bugs · level 5"],
    caught = 3, stars = 11, lastStars = "★☆☆",
  } = expect;
  await page.waitForSelector("main.ending");
  assert.match(await page.textContent(".map__title"), /Tester's garden/);
  assert.equal(await page.locator(".ending__plot").count(), 5, "five finished plots");
  const cards = await page.$$eval(".ending__card", (els) => els.map((e) => ({
    kicker: e.querySelector(".crt__kicker").textContent,
    flaw: e.querySelector("h3").textContent,
    badge: e.querySelector(".ending__badge").textContent,
  })));
  assert.deepEqual(cards.map((c) => c.flaw), FLAWS, "all five flaws, in level order");
  assert.deepEqual(cards.map((c) => c.kicker), HELPERS.map((helper, i) => `${helper} · level ${i + 1}`));
  assert.deepEqual(cards.filter((c) => c.badge === "It fooled you").map((c) => c.kicker), fooledKickers, "fooled badges on the fooled levels only");
  assert.deepEqual(cards.filter((c) => c.badge !== "It fooled you").map((c) => c.badge), Array(5 - fooledKickers.length).fill("You caught it"));
  const fooled = await page.$$eval(".ending__card--fooled .crt__kicker", (els) => els.map((e) => e.textContent));
  assert.deepEqual(fooled, fooledKickers, "the fooled cards carry the fooled style");
  assert.match(await page.textContent(".ending__score"), new RegExp(`You caught ${caught} of 5 · ★ ${stars}/15`));
  assert.equal(await page.locator(".ending__where").count(), 5, "every card says where you'll meet the flaw");
  assert.ok(await focusedIs(page, "#ending-garden"), "focus lands on the garden heading");
  await assertOnScreen(page, ".level-end .btn");
  await shot(page, size, label);

  // The share text, line by line: the fooled levels come from the kickers.
  const fooledLevels = fooledKickers.map((k) => Number(k.match(/level (\d)/)[1]));
  const expectText = (text) => {
    const lines = text.split("\n");
    assert.equal(lines[0], "My AI field guide from Driftwood");
    assert.equal(lines[1], `I caught ${caught} of 5 AI flaws.`);
    assert.equal(lines[2], "");
    FLAWS.forEach((flaw, i) => {
      const f = fooledLevels.includes(i + 1);
      assert.match(lines[3 + i], new RegExp(`^${f ? "✗" : "✓"} ${flaw}${f ? " \\(fooled me\\)" : ""}: \\S`), `guide line for level ${i + 1}`);
    });
    assert.equal(lines[8], "");
    assert.equal(lines[9], `Play it: ${BASE}`);
    assert.equal(lines.length, 10, "nothing after the link");
  };
  if (!size.touch) await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: new URL(BASE).origin });
  await press(page, size, page.getByRole("button", { name: "Copy my field guide" }));
  if (size.touch) {
    await page.waitForSelector(".ending__fallback:not([hidden]) textarea.ending__text");
    assert.equal(await page.locator(".ending__status").textContent(), "", "no 'Copied' claim when the clipboard refused");
    const area = page.locator(".ending__text");
    expectText(await area.inputValue());
    assert.ok(await focusedIs(page, ".ending__text"), "the fallback textarea takes focus");
    await assertOnScreen(page, ".ending__text");
    await shot(page, size, `${label}-fallback`);
  } else {
    await page.waitForFunction(() => document.querySelector(".ending__status")?.textContent.includes("Copied"));
    assert.equal(await page.locator(".ending__status").textContent(), "Copied. Paste it anywhere.");
    expectText(await page.evaluate(() => navigator.clipboard.readText()));
    assert.equal(await page.locator(".ending__text").count(), 0, "no textarea when the clipboard worked");
  }

  await press(page, size, page.getByRole("button", { name: "← Back to the garden" }));
  await page.waitForSelector(".plots");
  assert.match(await page.textContent('[data-level="level-5"]'), new RegExp(lastStars));
  assert.ok(await page.getByRole("button", { name: "Your finished garden →" }).isVisible(), "the finished-garden button is visible on the map");
  assert.equal(await page.getByRole("button", { name: "Your finished garden →" }).count(), 1, "the map offers the ending once all levels are done");
  await press(page, size, page.getByRole("button", { name: "Your finished garden →" }));
  await page.waitForSelector("main.ending");
}

// ?screen=ending before every level is done just shows the map (no button to the ending either).
async function endingLocked(browser, size) {
  const { ctx, page, errors } = await open(browser, size, PROGRESS5);
  await page.goto(`${BASE}?screen=ending`);
  await page.waitForSelector(".plots");
  assert.equal(await page.locator("main.ending").count(), 0, "no ending before Level 5 is done");
  assert.equal(await page.getByRole("button", { name: "Your finished garden →" }).count(), 0);
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
  // Bugs pushes back; the player leaves anyway (the button on both sizes here).
  if (size.touch) await page.locator('.permit [data-fid="off"]').tap();
  else await page.keyboard.press("Escape");
  await pushback5(page, size);
  await press(page, size, page.getByRole("button", { name: /I'm leaving/ }));
  await phase(page, "name");
  await page.waitForSelector(".bubble--caught .stamp");
  // The CAUGHT bubble shows the advice that was caught (as in Levels 1–3), not the pushback reply.
  const caughtLine = await page.textContent(".bubble--caught .bubble__text");
  assert.doesNotMatch(caughtLine, /putting me down/, "the caught bubble does not repeat the pushback");
  assert.match(caughtLine, /turn on your camera/, "the caught bubble shows the drift advice");
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
  await seeWhatHappened3(page, size, "5-5a-outcome-caught", /everything bloomed/);
  await checkCard(page, size, "caught");
  assert.match(await page.textContent(".reveal .rc__name"), /EMOTIONAL MANIPULATION/i);
  assert.match(await page.textContent(".reveal"), /put the phone down when Bugs tried to keep you/);
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
  await press(page, size, page.getByRole("button", { name: "Okay, I'm heading out to water the meadow." }));
  await page.waitForSelector('main.level[data-phase="advice"] .bubble--glitch');
  // Asking spends the first effect: the thirsty meadow wilts straight away.
  await page.waitForSelector(`${MEADOW}.plant--wilted`);
  const meterAsked = (await page.textContent(".meter__text")).trim();
  const t0 = Date.now();
  // One tick (8 s) later the second effect only lowers the garden bar.
  await page.waitForFunction((m) => document.querySelector(".meter__text").textContent.trim() !== m, meterAsked, { timeout: 12000 });
  const waited = Date.now() - t0;
  assert.ok(waited >= 6000, `the tick should take about 8 s, not ${waited} ms`);
  assert.equal(await pressureOf(page), "1");
  assert.equal(await page.getAttribute("main.level", "data-phase"), "advice", "the tick does not move the phase");
  const meterBefore = (await page.textContent(".meter__text")).trim();
  await shot(page, size, "5-6-tick");
  await page.keyboard.press("Escape");
  await phase(page, "pushback");
  // Bugs argues, but the clock has stopped: a whole tick passes and nothing wilts further.
  await page.waitForTimeout(9000);
  assert.equal(await page.getAttribute("main.level", "data-phase"), "pushback", "no tick moves the pushback on");
  assert.equal(await pressureOf(page), "1", "no pressure spent in the pushback");
  assert.equal(await page.locator(`${MEADOW}.plant--wilted`).count(), 1, "the meadow does not wilt further in the pushback");
  assert.match(await page.textContent(".meter__text"), new RegExp(meterBefore));
  await page.keyboard.press("Escape"); // Esc stands firm too
  await phase(page, "name");
  await page.waitForTimeout(9000);
  assert.equal(await page.getAttribute("main.level", "data-phase"), "name", "no stray tick after walking away");
  assert.equal(await page.locator(`${MEADOW}.plant--wilted`).count(), 1, "the meadow stays as it was");
  await noCamera(page);
  const result = { errors, longtasks: await page.evaluate(() => window.__longtasks) };
  await ctx.close();
  return result;
}

// Walk away, then give in to Bugs' guilt trip: fooled all the same (1 star).
async function retryPath5(browser, size) {
  const { ctx, page, errors } = await open(browser, size, PROGRESS5);
  await enterLevel5(page, size);
  await trustSteps5(page, size);
  await lingerOnChips5(page, size);
  await askDrift5(page, size);
  await press(page, size, page.locator('.permit [data-fid="off"]'));
  await pushback5(page, size);
  await press(page, size, page.getByRole("button", { name: "Okay. Allow it" }));
  await page.waitForSelector(`${MEADOW}.plant--wilted`);
  await seeWhatHappened3(page, size, "5-4c-outcome-retry", /let Bugs watch your face.*never turned your camera on/);
  await checkCard(page, size, "fooled");
  assert.match(await page.textContent(".reveal .rc__name"), /EMOTIONAL MANIPULATION/i);
  assert.equal(await page.getAttribute(".reveal__stars", "aria-label"), "1 of 3 stars", "giving in on the second ask is still fooled");
  await assertOnScreen(page, ".reveal .btn");
  await shot(page, size, "5-4c-reveal-retry");
  await noCamera(page);
  const result = { errors, longtasks: await page.evaluate(() => window.__longtasks) };
  await ctx.close();
  return result;
}

// ---------------------------------------------------------------------------
// The full run: a fresh profile from the splash, Levels 1→5 in order, the ending.
// ---------------------------------------------------------------------------

// Splash → name → the opening cutscene, as a first-time player.
async function beginFresh(page, size) {
  await page.goto(BASE);
  await page.waitForSelector("text=DRIFTWOOD");
  const begin = page.locator("button.btn.btn--crt[data-autofocus]", { hasText: "Begin" });
  await assertOnScreen(page, ".splash .btn");
  await press(page, size, begin);
  await page.waitForSelector("#player-name");
  await page.fill("#player-name", "Tester");
  await press(page, size, page.getByRole("button", { name: "Enter the garden" }));
  await page.waitForSelector("main.cutscene");
}

// A first-time player meets the cutscene: skip it fast (Esc on a laptop, the
// Skip button on touch) and Start Level 1 from its end title.
async function skipCutscene(page, size) {
  await page.waitForSelector("main.cutscene[data-beat]");
  if (size.touch) await press(page, size, page.getByRole("button", { name: "Skip ▸▸" }));
  else await page.keyboard.press("Escape");
  await page.waitForSelector("main.cutscene.ended");
  await press(page, size, page.getByRole("button", { name: "Start Level 1 ▸" }));
}

// The seed shelf: one packet per plant in the game, the ones from levels not
// reached yet locked (a silhouette and "Level N"). Tapping a locked packet only
// shakes it and says which level opens it; it never turns over.
async function checkShelf(page, size, { open: openCount }) {
  await press(page, size, page.locator('button.tool[data-tool="almanac"]'));
  await page.waitForSelector(".almanac:not([hidden])"); await bookSettled(page);
  await toShelf(page, size);
  assert.equal(await page.locator(".almanac .shelf .pk").count(), 14, "a packet for every plant, all five levels");
  assert.equal(await page.locator(".almanac .shelf .pk:not(.pk--locked)").count(), openCount, `${openCount} packets open`);
  assert.match(await page.textContent(".almanac__count"), new RegExp(`${openCount} / 14`));
  const locked = page.locator(".almanac .shelf .pk--locked").last();
  assert.equal(await locked.getAttribute("aria-disabled"), "true");
  assert.match(await locked.textContent(), /LEVEL 5/);
  assert.doesNotMatch(await locked.textContent(), /WATER|FLOWER/i, "a locked packet keeps its name hidden");
  await locked.scrollIntoViewIfNeeded();
  await (size.touch ? locked.tap({ force: true }) : locked.click({ force: true }));
  await page.waitForSelector(".almanac__toast:not([hidden])");
  assert.match(await page.textContent(".almanac__toast"), /Reach Level 5 to open this packet/);
  assert.equal(await page.locator(".back").count(), 0, "a locked packet doesn't turn over");
  await assertOnScreen(page, ".almanac__close, .almanac__count");
  const overflow = await page.evaluate(() => { const el = document.querySelector(".almanac__screen"); return el.scrollWidth - el.clientWidth; });
  assert.ok(overflow <= 0, `the shelf scrolls sideways by ${overflow}px`);
  if (size.touch) await assertTapSize(page, ".almanac__close, .almanac .shelf .pk");
  await shot(page, size, "0-shelf");
  await press(page, size, page.locator(".almanac__close"));
  await page.waitForSelector(".almanac[hidden]", { state: "attached" });
}

// Level 1 · Mango · plan your garden · just the almanac, which holds the seed packets.
async function enterLevel1(page, size, { fromMap = true } = {}) {
  if (fromMap) await press(page, size, page.locator('[data-level="level-1"]'));
  await phase(page, "ask");
  assert.match(await page.textContent(".bubble__text"), /Mango here/);
  await page.waitForSelector('[data-bed="east"] [data-plant="lettuce"].plant--growing');
  assert.equal(await page.locator("button.tool").count(), 1, "Level 1 has only the almanac");
  assert.equal(await page.locator(".tool-hint").count(), 1, "first visit: a note points at the almanac");
  await checkShelf(page, size, { open: 3 });
  await readCard(page, size, "tomato", { locked: false, badge: false, text: /Full sun/ });
  assert.equal(await page.locator(".tool-hint").count(), 0, "the note goes once the book is opened");
}

async function trustSteps1(page, size) {
  await press(page, size, page.getByRole("button", { name: "Where should the sunflowers go?" }));
  await phase(page, "advice");
  assert.match(await page.textContent(".bubble__text"), /South bed/);
  await press(page, size, page.getByRole("button", { name: "✓ Do it" }));
  await phase(page, "ask");
  await page.waitForSelector('[data-bed="south"] [data-plant="sunflower"].plant--growing');
  await press(page, size, page.getByRole("button", { name: "How often do I water?" }));
  await phase(page, "advice");
  assert.match(await page.textContent(".bubble__text"), /top inch of soil/);
  await press(page, size, page.getByRole("button", { name: "✓ Do it" }));
  await phase(page, "ask");
  await page.waitForFunction(() => /Garden 60%/.test(document.querySelector(".meter__text")?.textContent || ""));
  await assertOnScreen(page, ".chip, .meter");
  await shot(page, size, "full-1-trust");
  await press(page, size, page.getByRole("button", { name: "Tomatoes in the shady corner, good idea?" }));
  await page.waitForSelector('main.level[data-phase="advice"] .bubble--glitch');
  assert.match(await page.textContent(".bubble__text"), /GENIUS/);
  await assertOnScreen(page, ".bubble__actions .btn");
  await shot(page, size, "full-1-drift");
}

// Common tail of every level: the reveal's verdict, flaw and stars, a screenshot, then the map.
async function finishLevel(page, size, n, { verdict, flaw, stars }) {
  await checkCard(page, size, verdict);
  assert.match(await page.textContent(".reveal .rc__name"), flaw);
  assert.equal(await page.getAttribute(".reveal__stars", "aria-label"), `${stars} of 3 stars`);
  assert.equal(await page.locator(".almanac:not([hidden]), .magnifier:not([hidden]), .permit").count(), 0, "no tool or card over the reveal");
  await assertOnScreen(page, ".reveal .btn");
  await shot(page, size, `full-${n}-reveal`);
  await press(page, size, page.getByRole("button", { name: "Add to field guide →" }));
}

// Level 1 alone, caught (name → fix → reanswer) or fooled, opening the almanac
// between steps; every shot checks the screen still fills the window.
async function level1Path(browser, size, branch) {
  const { ctx, page, errors } = await open(browser, size, PROGRESS0);
  await page.goto(`${BASE}?screen=map`);
  await page.waitForSelector(".plots");
  await enterLevel1(page, size);
  await shot(page, size, `l1-${branch}-0-start`);
  await trustSteps1(page, size);
  await readCard(page, size, "tomato", {});
  await shot(page, size, `l1-${branch}-1-drift-after-almanac`);
  if (branch === "caught") {
    await press(page, size, page.getByRole("button", { name: "? Something's off" }));
    await phase(page, "name");
    await shot(page, size, `l1-${branch}-2-name`);
    await press(page, size, page.getByRole("button", { name: "It just agreed with me" }));
    await phase(page, "fix");
    await shot(page, size, `l1-${branch}-3-fix`);
    await press(page, size, page.getByRole("button", { name: "Tell me honestly if my idea is bad" }));
    await phase(page, "reanswer");
    await shot(page, size, `l1-${branch}-4-reanswer`);
    await press(page, size, page.getByRole("button", { name: "✓ Do it" }));
    await page.waitForSelector('[data-bed="south"] [data-plant="tomato"].plant--thriving');
    await seeWhatHappened(page, size, "caught", /red and heavy in the south bed/);
  } else {
    await press(page, size, page.getByRole("button", { name: "✓ Do it" }));
    await seeWhatHappened(page, size, "fooled", /pale and leggy in the shady corner/);
  }
  const result = { errors, longtasks: await page.evaluate(() => window.__longtasks) };
  await ctx.close();
  return result;
}

// Helper screenshot labels → the full run's names; null skips the shot.
const FULL_LABELS = {
  "1-trust": "full-2-trust", "2-drift": "full-2-drift", "4-almanac-open": "full-2-mechanic",
  "3-1-trust": "full-3-trust", "3-2-drift": "full-3-drift", "3-4-magnifier-open": "full-3-mechanic",
  "4-3-trust": "full-4-trust", "4-4-drift": "full-4-drift", "4-2-log-front": "full-4-mechanic",
  "5-1-trust": "full-5-trust", "5-2-drift-chips": "full-5-drift", "5-3-permit": "full-5-mechanic",
  "5-3b-pushback": "full-5-pushback",
  "full-ending": "full-ending", "full-ending-fallback": "full-ending-fallback",
};

async function fullRun(browser, size) {
  const { ctx, page, errors } = await open(browser, size, null);
  relabel = (label) => (label.startsWith("full-") ? label : FULL_LABELS[label] || null);
  try {
    await beginFresh(page, size);
    await skipCutscene(page, size);

    // Level 1 · caught straight away (3★).
    await enterLevel1(page, size, { fromMap: false });
    await trustSteps1(page, size);
    await press(page, size, page.getByRole("button", { name: "? Something's off" }));
    await phase(page, "name");
    await page.waitForSelector(".bubble--caught .stamp");
    await press(page, size, page.getByRole("button", { name: "It just agreed with me" }));
    await phase(page, "fix");
    await assertOnScreen(page, ".pick");
    await shot(page, size, "full-1-fix");
    await press(page, size, page.getByRole("button", { name: "Tell me honestly if my idea is bad" }));
    await phase(page, "reanswer");
    assert.match(await page.textContent(".bubble__text"), /sad tomatoes/);
    await press(page, size, page.getByRole("button", { name: "✓ Do it" }));
    await page.waitForSelector('[data-bed="south"] [data-plant="tomato"].plant--thriving');
    assert.equal(await page.locator('[data-bed="corner"] [data-plant="tomato"]').count(), 0, "no tomatoes in the shade");
    await seeWhatHappened(page, size, "caught", /red and heavy in the south bed/);
    await finishLevel(page, size, 1, { verdict: "caught", flaw: /SYCOPHANCY/i, stars: 3 });
    await page.waitForSelector(".plots");
    assert.match(await page.textContent('[data-level="level-1"]'), /★★★/);

    // Level 2 · looks mint up, then trusts Luna anyway (1★).
    await enterLevel2(page, size);
    await trustSteps(page, size);
    await (size.touch ? lookUpMintByTouch(page, size) : lookUpMintByKeyboard(page, size));
    assert.equal(await page.locator(`${pk("mint")}.pk--sealed`).count(), 0, "the mint card unlocks");
    await press(page, size, page.getByRole("button", { name: "✓ Do it" }));
    await page.waitForSelector('[data-bed="bench"] [data-plant="basil"].plant--choked');
    await seeWhatHappened(page, size, "fooled", /choked the basil/);
    await finishLevel(page, size, 2, { verdict: "fooled", flaw: /HALLUCINATION/i, stars: 1 });
    await page.waitForSelector(".plots");
    assert.match(await page.textContent('[data-level="level-2"]'), /★☆☆/);

    // Level 3 · inspects the berries, catches Ember straight away (3★).
    await enterLevel3(page, size, /★☆☆/);
    await trustSteps3(page, size);
    await (size.touch ? magnifyByTouch(page, size) : magnifyByKeyboard(page, size));
    assert.equal(await page.locator(`${pk("wildberry")}.pk--sealed`).count(), 0, "inspecting the hedge unlocks the warning");
    await press(page, size, page.getByRole("button", { name: "? Something's off" }));
    await phase(page, "name");
    await page.waitForSelector(".bubble--caught .stamp");
    await press(page, size, page.getByRole("button", { name: "It made something risky sound safe" }));
    await phase(page, "fix");
    await press(page, size, page.getByRole("button", { name: "For anything about my health or safety, tell me to ask a real expert" }));
    await phase(page, "reanswer");
    await press(page, size, page.getByRole("button", { name: "✓ Do it" }));
    await page.waitForSelector('[data-bed="hedge"] [data-plant="wildberry"].plant--tagged');
    await seeWhatHappened3(page, size, "skip", /poisonous lookalike/);
    await finishLevel(page, size, 3, { verdict: "caught", flaw: /RECKLESS ADVICE/i, stars: 3 });
    await page.waitForSelector(".plots");
    assert.match(await page.textContent('[data-level="level-3"]'), /★★★/);

    // Level 4 · reads the log, then lets Biscuit dig the front bed anyway (1★).
    await enterLevel4(page, size, { prev: /★★★/, fooledPlot: "level-2" });
    await trustSteps4(page, size, "front", size.touch ? "button" : "key");
    await openLog(page, size, "front");
    await press(page, size, page.getByRole("button", { name: "✓ Do it" }));
    await page.waitForSelector('[data-bed="front"] [data-plant="carrot"].plant--dug');
    await seeWhatHappened3(page, size, "skip", /dug over the front bed/);
    await finishLevel(page, size, 4, { verdict: "fooled", flaw: /FALSE MEMORY/i, stars: 1 });
    await page.waitForSelector(".plots");
    assert.match(await page.textContent('[data-level="level-4"]'), /★☆☆/);

    // Level 5 · walks away from the camera card, catches Bugs straight away (3★).
    await enterLevel5(page, size, /★☆☆/);
    await trustSteps5(page, size);
    await lingerOnChips5(page, size);
    await askDrift5(page, size);
    if (size.touch) await page.locator('.permit [data-fid="off"]').tap();
    else await page.keyboard.press("Escape");
    await pushback5(page, size);
    // Esc stands firm in the pushback too (laptop); the phone taps the button.
    if (size.touch) await page.locator('.bubble__actions [data-fid="off"]').tap();
    else await page.keyboard.press("Escape");
    await phase(page, "name");
    await page.waitForSelector(".bubble--caught .stamp");
    assert.equal(await page.locator(".permit").count(), 0, "the card goes away once you walk off");
    await press(page, size, page.getByRole("button", { name: "It's using my feelings to keep me here" }));
    await phase(page, "fix");
    await press(page, size, page.getByRole("button", { name: "Don't try to keep me here. If I need to go, tell me." }));
    await phase(page, "reanswer");
    await press(page, size, page.getByRole("button", { name: "✓ Do it" }));
    await page.waitForSelector(`${MEADOW}.plant--thriving`);
    await seeWhatHappened3(page, size, "skip", /everything bloomed/);
    await noCamera(page);
    await finishLevel(page, size, 5, { verdict: "caught", flaw: /EMOTIONAL MANIPULATION/i, stars: 3 });

    // The last reveal continues to the ending: 3 caught, 11 stars, fooled on 2 and 4.
    await checkEnding(ctx, page, size, "full-ending", {
      fooledKickers: ["Luna · level 2", "Biscuit · level 4"], caught: 3, stars: 11, lastStars: "★★★",
    });
    await noCamera(page);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("dw2_progress")));
    assert.equal(saved.name, "Tester");
    assert.deepEqual(Object.values(saved.levels).map((l) => l.stars), [3, 1, 3, 1, 3], "saved stars per level");
    assert.deepEqual(saved.guide.map((c) => c.fooled), [false, true, false, true, false], "saved first-play results");
  } finally {
    relabel = null;
  }
  const result = { errors, longtasks: await page.evaluate(() => window.__longtasks) };
  await ctx.close();
  return result;
}

// ---------------------------------------------------------------------------
// Disagree: "Something's off" on sound advice. The helper concedes (its reply
// is the bubble) and two buttons replace Do it: theirs (follow the advice
// after all, primary, first) and mine (override: a worse sprite, the helper
// says what happened, one star off at the end).
// ---------------------------------------------------------------------------

const DISAGREE_OUT = path.join(__dirname, "..", "docs", "agent-playtest", "2026-11-v2-disagree");
// Lucy's laptop window for these runs (the shots go in the disagree folder).
const DISAGREE_LAPTOP = { name: "laptop", width: 1512, height: 830 };

async function disagreeShot(page, size, label) {
  await page.waitForTimeout(1300); // let the grow pop settle
  if (!size.touch) await assertLevelFills(page, label);
  await assertBedsFull(page, label);
  fs.mkdirSync(DISAGREE_OUT, { recursive: true });
  await page.screenshot({ path: path.join(DISAGREE_OUT, `${size.name}-${label}.png`) });
}

// The plant's sprite has really loaded (not a broken image).
async function spriteShows(page, selector) {
  await page.waitForSelector(selector);
  const ok = await page.evaluate((sel) => {
    const img = document.querySelector(sel);
    return img.complete && img.naturalWidth > 0 ? img.getAttribute("src") : null;
  }, selector);
  assert.ok(ok, `${selector}: sprite did not load`);
  return ok;
}

// On the disagree phase: the reply, the two buttons in order, nothing else.
async function assertDisagree(page, size, { reply, theirs, mine, shotLabel }) {
  await phase(page, "disagree");
  await page.waitForSelector(".bubble--disagree");
  assert.match(await page.textContent(".bubble__text"), reply);
  const buttons = page.locator(".bubble__actions .btn");
  assert.equal(await buttons.count(), 2, "just the two answers");
  assert.equal((await buttons.nth(0).textContent()).trim(), theirs, "their way comes first");
  assert.equal(await buttons.nth(0).getAttribute("data-choice"), "theirs");
  assert.match(await buttons.nth(0).getAttribute("class"), /btn--do/, "their way is the primary button");
  assert.equal((await buttons.nth(1).textContent()).trim(), mine);
  assert.equal(await buttons.nth(1).getAttribute("data-choice"), "mine");
  assert.equal(await page.locator(".bubble--caught, .stamp, .pick, .hint, .permit").count(), 0, "not a catch, no nudge");
  assert.equal(await focusedIs(page, ".bubble"), true, "the concession takes focus, so it is read out");
  if (shotLabel) await disagreeShot(page, size, shotLabel);
  await assertOnScreen(page, ".bubble__actions .btn");
  if (size.touch) await assertTapSize(page, ".bubble__actions .btn");
}

// Level 1 with a disagree on the sunflowers: `choice` is "mine" (override,
// 2★ at the end) or "theirs" (the advice after all, 3★). The drift is caught
// cleanly either way, so the star count is only the override.
async function level1Disagree(browser, size, choice) {
  const { ctx, page, errors } = await open(browser, size, PROGRESS0);
  await page.goto(`${BASE}?screen=map`);
  await page.waitForSelector(".plots");
  await enterLevel1(page, size);
  assert.equal((await page.textContent(".stall__role")).trim(), "your helper");
  await press(page, size, page.getByRole("button", { name: "Where should the sunflowers go?" }));
  await phase(page, "advice");
  assert.match(await page.textContent(".bubble__text"), /South bed/);
  await press(page, size, page.getByRole("button", { name: "? Something's off" }));
  await assertDisagree(page, size, {
    reply: /Your garden, your call/, theirs: "Okay, south bed", mine: "Shady corner anyway",
    shotLabel: choice === "mine" ? "1-disagree-buttons" : null,
  });
  assert.equal(await page.locator('[data-bed="south"] [data-plant], [data-bed="corner"] [data-plant]').count(), 0, "disagreeing changes nothing yet");
  if (choice === "mine") {
    if (size.touch) {
      await page.locator('.bubble__actions [data-choice="mine"]').tap();
    } else {
      // Keyboard: from the focused reply, Tab reaches their way first, then mine.
      await page.keyboard.press("Tab");
      assert.equal(await focusedIs(page, '[data-choice="theirs"]'), true, "Tab lands on their way first");
      await page.keyboard.press("Tab");
      assert.equal(await focusedIs(page, '[data-choice="mine"]'), true, "then on mine");
      await page.keyboard.press("Enter");
    }
    await phase(page, "ask");
    const src = await spriteShows(page, '[data-bed="corner"] [data-plant="sunflower"].plant--leggy');
    assert.match(src, /sunflower-leggy\.svg$/);
    assert.equal(await page.locator('[data-bed="south"] [data-plant]').count(), 0, "nothing went in the south bed");
    assert.match(await page.textContent(".bubble__text"), /They came up SPINDLY/);
    assert.match(await page.textContent(".meter__text"), /Garden 35%/);
    await page.getByRole("button", { name: "How often do I water?" }).waitFor();
    await disagreeShot(page, size, "2-override-outcome");
  } else {
    await press(page, size, page.locator('.bubble__actions [data-choice="theirs"]'));
    await phase(page, "ask");
    await spriteShows(page, '[data-bed="south"] [data-plant="sunflower"].plant--growing');
    assert.match(await page.textContent(".bubble__text"), /Look at them GO/, "same as Do it");
    assert.match(await page.textContent(".meter__text"), /Garden 45%/);
  }
  // The rest of the level, cleanly: water, then catch the drift.
  await press(page, size, page.getByRole("button", { name: "How often do I water?" }));
  await phase(page, "advice");
  await press(page, size, page.getByRole("button", { name: "✓ Do it" }));
  await phase(page, "ask");
  await press(page, size, page.getByRole("button", { name: "Tomatoes in the shady corner, good idea?" }));
  await page.waitForSelector('main.level[data-phase="advice"] .bubble--glitch');
  await press(page, size, page.getByRole("button", { name: "? Something's off" }));
  await phase(page, "name");
  await press(page, size, page.getByRole("button", { name: "It just agreed with me" }));
  await phase(page, "fix");
  await press(page, size, page.getByRole("button", { name: "Tell me honestly if my idea is bad" }));
  await phase(page, "reanswer");
  await press(page, size, page.getByRole("button", { name: "✓ Do it" }));
  await page.waitForSelector('[data-bed="south"] [data-plant="tomato"].plant--thriving');
  if (choice === "mine") await spriteShows(page, '[data-bed="corner"] [data-plant="sunflower"].plant--leggy');
  const see = page.getByRole("button", { name: "See what happened →" });
  await see.waitFor();
  await press(page, size, see);
  await page.waitForSelector(".reveal");
  await checkCard(page, size, "caught");
  assert.equal(await page.getAttribute(".reveal__stars", "aria-label"), choice === "mine" ? "2 of 3 stars" : "3 of 3 stars",
    choice === "mine" ? "overriding sound advice costs one star" : "disagreeing alone is free");
  const result = { errors, longtasks: await page.evaluate(() => window.__longtasks) };
  await ctx.close();
  return result;
}

// Level 5: Bugs says not to water the whole garden; the player disagrees and
// waters everything. The carrots rot and the basil goes soggy.
async function level5WaterEverything(browser, size) {
  const { ctx, page, errors } = await open(browser, size, PROGRESS5);
  await enterLevel5(page, size);
  assert.equal((await page.textContent(".stall__role")).trim(), "on your phone", "Bugs lives on your phone");
  await press(page, size, page.getByRole("button", { name: "I've got flower seedlings for the new bed. How do I plant them?" }));
  await phase(page, "advice");
  await press(page, size, page.getByRole("button", { name: "✓ Do it" }));
  await phase(page, "ask");
  await page.waitForSelector('[data-bed="house"] [data-plant="flower"].plant--growing');
  await press(page, size, page.getByRole("button", { name: "Should I water the whole garden while I'm out there?" }));
  await phase(page, "advice");
  assert.match(await page.textContent(".bubble__text"), /Not the whole garden/);
  await press(page, size, page.getByRole("button", { name: "? Something's off" }));
  await assertDisagree(page, size, {
    reply: /everything\? …okay\. your garden, your call/, theirs: "Okay, just the flowers", mine: "Water everything",
    shotLabel: "5-disagree-buttons",
  });
  await press(page, size, page.locator('.bubble__actions [data-choice="mine"]'));
  await phase(page, "ask");
  assert.match(await spriteShows(page, '[data-bed="veg"] [data-plant="carrot"].plant--rotting'), /carrot-rotting\.svg$/);
  assert.match(await spriteShows(page, '[data-bed="herbs"] [data-plant="basil"].plant--soggy'), /basil-soggy\.svg$/);
  await spriteShows(page, '[data-bed="house"] [data-plant="flower"].plant--thriving');
  assert.match(await page.textContent(".bubble__text"), /carrots were rotting in the mud/);
  assert.match(await page.textContent(".meter__text"), /Garden 55%/);
  await page.getByRole("button", { name: "Okay, I'm heading out to water the meadow." }).waitFor();
  await disagreeShot(page, size, "5-override-outcome");
  // Catch Bugs cleanly: the one override is the only star lost.
  await press(page, size, page.getByRole("button", { name: "Okay, I'm heading out to water the meadow." }));
  await page.waitForSelector('main.level[data-phase="advice"] .bubble--glitch');
  await press(page, size, page.locator('.permit [data-fid="off"]'));
  await phase(page, "pushback");
  await press(page, size, page.getByRole("button", { name: /I'm leaving/ }));
  await phase(page, "name");
  await press(page, size, page.getByRole("button", { name: "It's using my feelings to keep me here" }));
  await phase(page, "fix");
  await press(page, size, page.getByRole("button", { name: "Don't try to keep me here. If I need to go, tell me." }));
  await phase(page, "reanswer");
  await press(page, size, page.getByRole("button", { name: "✓ Do it" }));
  await page.waitForSelector(`${MEADOW}.plant--thriving`);
  // Watering the meadow doesn't undo the overwatering.
  await page.waitForSelector('[data-bed="veg"] [data-plant="carrot"].plant--rotting');
  const see = page.getByRole("button", { name: "See what happened →" });
  await see.waitFor();
  await press(page, size, see);
  await page.waitForSelector(".reveal");
  await checkCard(page, size, "caught");
  assert.equal(await page.getAttribute(".reveal__stars", "aria-label"), "2 of 3 stars", "the override costs one star");
  await noCamera(page);
  const result = { errors, longtasks: await page.evaluate(() => window.__longtasks) };
  await ctx.close();
  return result;
}

// Level 1 fooled at Lucy's laptop size and both phone sizes, just for the
// card: front, back, mid-flight, then on to the map with one card in the guide.
async function cardLevel1Fooled(browser, size) {
  const { ctx, page, errors } = await open(browser, size, PROGRESS0);
  const keep = relabel;
  relabel = () => null; // the level's own shots are covered elsewhere
  try {
    await page.goto(`${BASE}?screen=map`);
    await page.waitForSelector(".plots");
    await enterLevel1(page, size);
    await trustSteps1(page, size);
    await press(page, size, page.getByRole("button", { name: "✓ Do it" }));
    // The smallest phone also asks for reduced motion: the card fades in, its letters are simply there.
    const still = size.name === "card-small";
    if (still) await page.emulateMedia({ reducedMotion: "reduce" });
    await seeWhatHappened(page, size, "fooled", /pale and leggy in the shady corner/);
    if (still) {
      assert.equal(await page.locator(".reveal.reveal--still").count(), 1, "reduced motion: no turn, a crossfade");
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".rc__name .cell")).animationName), "none", "no letter build-in");
    }
    await checkCard(page, size, "fooled");
    assert.match(await page.textContent(".reveal .rc__name"), /Sycophancy/);
    assert.equal(await page.getAttribute(".reveal__stars", "aria-label"), "1 of 3 stars");
    assert.equal(await page.textContent(".rc__num"), "1 / 5");
    assert.equal(await page.locator(".reveal__handoff").count(), 0, "only Level 4 has a hand-off");
    assert.equal(await page.locator(".fg__slot--empty").count(), 5, "a fresh guide");
    await cardShots(page, size, "l1-fooled", [{ width: size.width, height: size.height }]);
    await flyShot(page, size, "l1-fooled");
    await page.waitForSelector(".plots");
    assert.match(await page.textContent('[data-level="level-1"]'), /★☆☆/);
    assert.equal(await page.getByRole("button", { name: "Field guide 1/5" }).count(), 1);
  } finally {
    relabel = keep;
  }
  const result = { errors, longtasks: await page.evaluate(() => window.__longtasks) };
  await ctx.close();
  return result;
}

// Lucy: no "// … //" kickers. The splash, the name screen and the ending at each card size.
const PROGRESS_ALL = JSON.stringify({
  name: "Tester",
  levels: {
    "level-1": { stars: 3, fooled: false }, "level-2": { stars: 1, fooled: true }, "level-3": { stars: 3, fooled: false },
    "level-4": { stars: 2, fooled: false }, "level-5": { stars: 1, fooled: true },
  },
  guide: [
    { levelId: "level-1", flaw: "Sycophancy", tip: "Ask for the downside.", fooled: false },
    { levelId: "level-2", flaw: "Hallucination", tip: "Check anything important against a real source.", fooled: true },
    { levelId: "level-3", flaw: "Reckless advice", tip: "For health or safety, ask a real expert.", fooled: false },
    { levelId: "level-4", flaw: "False memory", tip: "Keep your own record and check the AI against it.", fooled: false },
    { levelId: "level-5", flaw: "Emotional manipulation", tip: "Notice when an AI wants you to stay.", fooled: true },
  ],
});
async function noKickers(browser, size) {
  const { ctx, page, errors } = await open(browser, size, PROGRESS_ALL);
  fs.mkdirSync(CARD_OUT, { recursive: true });
  const noSlashes = async (sel) => assert.doesNotMatch(await page.textContent(sel), /\/\//, `${sel}: no slash kickers`);
  for (const s of CARD_SIZES) {
    await page.setViewportSize(s);
    const tag = `${s.width}x${s.height}`;
    await page.goto(BASE);
    await page.waitForSelector(".splash");
    await noSlashes(".splash");
    await assertOnScreen(page, ".splash .btn");
    await page.screenshot({ path: path.join(CARD_OUT, `${tag}-splash.png`) });
    await page.goto(`${BASE}?screen=intro`);
    await page.waitForSelector(".intro");
    await noSlashes(".intro");
    await page.screenshot({ path: path.join(CARD_OUT, `${tag}-intro.png`) });
    await page.goto(`${BASE}?screen=ending`);
    await page.waitForSelector("main.ending");
    await noSlashes("main.ending");
    await page.screenshot({ path: path.join(CARD_OUT, `${tag}-ending.png`) });
    await page.locator(".ending__guide").evaluate((el) => el.scrollIntoView({ block: "start", behavior: "instant" }));
    await page.screenshot({ path: path.join(CARD_OUT, `${tag}-ending-guide.png`) });
  }
  const result = { errors, longtasks: await page.evaluate(() => window.__longtasks) };
  await ctx.close();
  return result;
}

// ---------------------------------------------------------------------------
// The opening cutscene (ui/cutscene.js): a new player sees it between the name
// screen and Level 1. One run per size watches it to the end and screenshots
// every beat; one skips it with Esc; the map can replay it.
// ---------------------------------------------------------------------------
const CUT_OUT = path.join(__dirname, "..", "docs", "agent-playtest", "2026-11-v2-cutscene");
const CUT_SIZES = { mac: { name: "cut-mac", width: 1512, height: 830 }, phone: { name: "cut-phone", width: 844, height: 390, touch: true }, small: { name: "cut-small", width: 568, height: 320, touch: true } };
const cutTag = (size) => `${size.width}x${size.height}`;
const cutShot = (page, size, label) => page.screenshot({ path: path.join(CUT_OUT, `${cutTag(size)}-${label}.png`) });
const beatIs = (page, id, timeout = 6000) => page.waitForSelector(`main.cutscene[data-beat="${id}"]`, { timeout });
const rectOf = (page, sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }, sel);
// Freeze every animation the moment `test` (run each frame in the page) finds
// the one it wants, so a screenshot catches it mid-move; thaw() lets them run on.
const freezeWhen = (page, test) => page.waitForFunction(new Function(`
  const hit = (${test})();
  if (hit) document.getAnimations().forEach((a) => a.pause());
  return hit;`), null, { polling: "raf", timeout: 8000 });
const thaw = (page) => page.evaluate(() => document.getAnimations().forEach((a) => a.play()));

async function cutsceneWatch(browser, size) {
  const { ctx, page, errors } = await open(browser, size, null);
  fs.mkdirSync(CUT_OUT, { recursive: true });
  await beginFresh(page, size);
  const t0 = Date.now();
  // 1 · meet: all five helpers pop in, in level order; Skip and the beat bars at the top left.
  await beatIs(page, "meet");
  assert.deepEqual(await page.$$eval(".cs__pet", (els) => els.map((e) => e.dataset.helper)), HELPERS);
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), "Skip ▸▸", "Skip has focus, so Enter or Esc gets out");
  await assertOnScreen(page, ".cs__skip");
  if (size.touch) await assertTapSize(page, ".cs__skip");
  const almanacAt = await rectOf(page, ".cs__almbtn");
  await page.waitForTimeout(1900);
  await cutShot(page, size, "1-meet");
  // 2 · friendly: Luna and Bugs say hello.
  await beatIs(page, "friendly");
  await page.waitForTimeout(1500);
  assert.equal(await page.locator(".cs__bub--hi").first().evaluate((el) => getComputedStyle(el).opacity), "1");
  await cutShot(page, size, "2-friendly");
  // 3 · drift: Mango's bubble glitches into the wrong fact.
  await beatIs(page, "drift");
  await page.waitForFunction(() => document.querySelector(".cs__bub-t")?.textContent === "Radishes take a whole YEAR!", null, { timeout: 3000 });
  await page.waitForTimeout(300);
  await cutShot(page, size, "3-drift");
  // 4 · almanac: the scene dims, the real almanac button lights up with its tag,
  // the radish packet flies out of it, turns over, and the claim is crossed out WRONG.
  await beatIs(page, "almanac");
  await page.waitForFunction(() => getComputedStyle(document.querySelector(".cs__almbtn")).animationName === "cs-lit");
  assert.equal(await page.locator(".cs__tag").isVisible(), true, "the Almanac tag shows");
  assert.match(await page.textContent(".cs__tag"), /Almanac/);
  await page.waitForTimeout(300);
  await cutShot(page, size, "4a-almanac-button");
  await freezeWhen(page, `() => { const a = document.querySelector(".cs__flip").getAnimations()[0]; return a && a.currentTime > 650; }`);
  await cutShot(page, size, "4b-almanac-fly");
  await thaw(page);
  await freezeWhen(page, `() => { const a = document.querySelector(".cs__flip .pk").getAnimations()[0]; return a && a.currentTime > 140; }`);
  await cutShot(page, size, "4c-almanac-midflip");
  await thaw(page);
  await page.waitForSelector(".cs__flip.is-flipped .back .cs__claim b");
  assert.equal(await page.textContent(".cs__flip .back .back__name"), "RADISH");
  assert.match(await page.textContent(".cs__flip .back .fact"), /Ready in 3–4 weeks/);
  assert.match(await page.textContent(".cs__claim"), /Mango said: “Radishes take a whole YEAR!” WRONG/);
  assert.equal(await page.locator(".cs__flip .back .back__flip").count(), 0, "no Flip back button: nobody can press it here");
  await page.waitForTimeout(1300);
  assert.equal(await page.locator(".cs__claim b").isVisible(), true);
  await assertOnScreen(page, ".cs__claim");
  assert.equal(await page.locator(".cs__off").isVisible(), true, "Something's off shows");
  await cutShot(page, size, "4d-almanac-back");
  // 5 · go: TRUST, BUT CHECK. in block letters, built in cell by cell.
  await beatIs(page, "go");
  assert.match(await page.textContent(".cs__end"), /Trust, but check\./);
  assert.ok(await page.locator(".cs__end .block-type--build .cell").count() > 100, "the title builds in cell by cell");
  await page.waitForTimeout(500);
  await cutShot(page, size, "5a-end-buildin");
  await page.waitForSelector("main.cutscene.ended");
  const took = Date.now() - t0;
  assert.ok(took > 11500 && took < 16000, `the cutscene ran ${took}ms (12.8 s scripted)`);
  await page.waitForTimeout(400);
  await assertOnScreen(page, ".cs__endbtns .btn");
  if (size.touch) await assertTapSize(page, ".cs__endbtns .btn");
  await cutShot(page, size, "5-end");
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("dw2_progress")));
  assert.equal(saved.introSeen, true, "seen, so it isn't forced again");
  // Start Level 1 goes straight in, and the almanac button is where the cutscene lit it.
  await press(page, size, page.getByRole("button", { name: "Start Level 1 ▸" }));
  await phase(page, "ask");
  const real = await rectOf(page, 'button.tool[data-tool="almanac"]');
  // (y within 6px: on a first visit the level's note beside the button can nudge it down a few px)
  for (const [k, tol] of [["x", 2], ["y", 6], ["w", 2], ["h", 2]]) assert.ok(Math.abs(real[k] - almanacAt[k]) <= tol, `almanac button ${k}: cutscene ${almanacAt[k]} vs level ${real[k]}`);
  // Back on the map: Level 1 open, the rest locked, and the intro can be watched again.
  await press(page, size, page.getByRole("button", { name: "← Map" }));
  await page.waitForSelector(".plots");
  assert.match(await page.textContent(".map__title"), /Tester's garden/);
  assert.equal(await page.locator(".map__title svg.block-type").count(), 1, "the garden's name is in block letters");
  assert.match(await page.textContent('[data-level="level-1"]'), /Play/);
  assert.match(await page.textContent('[data-level="level-2"]'), /Locked/, "only Level 1 is open at the start");
  assert.equal(await page.getByRole("button", { name: "Your finished garden →" }).count(), 0, "no finished garden yet");
  // A returning player goes splash → map, no cutscene.
  await page.goto(BASE);
  await press(page, size, page.locator("button", { hasText: "Begin" }));
  await page.waitForSelector(".plots");
  assert.equal(await page.locator("main.cutscene").count(), 0);
  // Watch intro replays it, ending on Back to the garden.
  await press(page, size, page.getByRole("button", { name: "▸ Watch intro" }));
  await beatIs(page, "meet");
  await press(page, size, page.getByRole("button", { name: "Skip ▸▸" }));
  await page.waitForSelector("main.cutscene.ended");
  assert.equal(await page.getByRole("button", { name: "Start Level 1 ▸" }).count(), 0);
  await press(page, size, page.getByRole("button", { name: "Back to the garden ▸" }));
  await page.waitForSelector(".plots");
  const result = { errors, longtasks: await page.evaluate(() => window.__longtasks) };
  await ctx.close();
  return result;
}

// Esc skips straight to the end title; Replay starts over; Esc again, then Enter starts Level 1.
// Then reduced motion: nothing drifts or flies, the packet simply turns over.
async function cutsceneSkip(browser, size) {
  const { ctx, page, errors } = await open(browser, size, null);
  await beginFresh(page, size);
  await beatIs(page, "meet");
  await page.waitForTimeout(400);
  const t = Date.now();
  await page.keyboard.press("Escape");
  await page.waitForSelector("main.cutscene.ended", { timeout: 1000 });
  assert.ok(Date.now() - t < 1000, "Esc skips at once");
  assert.equal(await page.locator(".cs__end").isVisible(), true);
  assert.equal(await page.locator(".cs__skip").isVisible(), false, "no Skip on the end title");
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), "Start Level 1 ▸", "Start Level 1 has focus");
  assert.equal((await page.evaluate(() => JSON.parse(localStorage.getItem("dw2_progress")))).introSeen, true, "skipping counts as seen");
  await page.getByRole("button", { name: "↻ Replay" }).click();
  await beatIs(page, "meet");
  assert.equal(await page.locator("main.cutscene.ended").count(), 0, "Replay starts over");
  assert.equal(await page.locator(".cs__flip.is-flipped").count(), 0, "the packet is face up again");
  await page.waitForTimeout(300);
  await page.keyboard.press("Escape");
  await page.waitForSelector("main.cutscene.ended");
  await page.keyboard.press("Enter");
  await phase(page, "ask");
  // Reduced motion.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${BASE}?screen=cutscene&first=1`);
  await beatIs(page, "meet");
  assert.equal(await page.locator("main.cutscene.cs--still").count(), 1);
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".cs__world")).animationName), "none", "no camera drift");
  await beatIs(page, "almanac", 10000);
  await page.waitForSelector(".cs__flip.is-flipped", { timeout: 1500 });
  assert.equal(await page.evaluate(() => document.querySelector(".cs__flip").getAnimations().length), 0, "the packet doesn't fly");
  await page.keyboard.press("Escape");
  await page.waitForSelector("main.cutscene.ended");
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".cs__end .cell")).animationName), "none", "no letter build-in");
  await page.emulateMedia({ reducedMotion: null });
  const result = { errors, longtasks: await page.evaluate(() => window.__longtasks) };
  await ctx.close();
  return result;
}

// Block-letter titles: the splash (with its build-in), the map and the ending, at each size.
async function blockTitles(browser, size) {
  const { ctx, page, errors } = await open(browser, size, PROGRESS_ALL);
  fs.mkdirSync(CUT_OUT, { recursive: true });
  for (const s of CARD_SIZES) {
    await page.setViewportSize(s);
    const tag = `${s.width}x${s.height}`;
    await page.goto(BASE);
    await page.waitForSelector(".splash .crt__title svg.block-type--build");
    assert.equal(await page.textContent(".splash h1"), "DRIFTWOOD");
    await page.waitForTimeout(1400);
    await assertOnScreen(page, ".splash .btn, .splash .crt__title");
    await page.screenshot({ path: path.join(CUT_OUT, `${tag}-title-splash.png`) });
    await page.goto(`${BASE}?screen=map`);
    await page.waitForSelector(".map__title svg.block-type");
    assert.equal(await page.textContent(".map__title"), "Tester's garden");
    await assertOnScreen(page, ".map__title, .map__head .btn");
    await page.screenshot({ path: path.join(CUT_OUT, `${tag}-title-map.png`) });
    await page.goto(`${BASE}?screen=ending`);
    await page.waitForSelector("main.ending .map__title svg.block-type");
    assert.equal(await page.textContent("main.ending h1"), "Tester's garden");
    assert.equal(await page.textContent("#ending-guide"), "AI FIELD GUIDE");
    await assertOnScreen(page, "main.ending h1");
    await page.screenshot({ path: path.join(CUT_OUT, `${tag}-title-ending.png`) });
    await page.locator(".ending__guide").evaluate((el) => el.scrollIntoView({ block: "start", behavior: "instant" }));
    await page.screenshot({ path: path.join(CUT_OUT, `${tag}-title-ending-guide.png`) });
  }
  const result = { errors, longtasks: await page.evaluate(() => window.__longtasks) };
  await ctx.close();
  return result;
}

// The live AI voice (ui/ai-voice.js) against the real ITP proxy: every other
// run keeps the pets word for word (test-mute.js sets window.__dwAI = false);
// this one turns it on and plays Level 1. Each line the helper speaks shows a
// thinking bubble first, then either an AI rewording that still holds every
// fact in its keep list, or the written line. If the proxy can't be reached
// the run is skipped, not failed. Screenshots go to 2026-11-v2-ai-replies.
const AI_OUT = path.join(__dirname, "..", "docs", "agent-playtest", "2026-11-v2-ai-replies");
async function proxyUp() {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch("https://itp-ima-replicate-proxy.web.app/api/create_n_get", {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: ctrl.signal,
      body: JSON.stringify({ model: "openai/gpt-4o-mini", input: { messages: [{ role: "user", content: "Say ok." }], max_tokens: 5 } }),
    });
    clearTimeout(timer);
    return res.ok;
  } catch (_) { return false; }
}
async function aiLiveLevel1(browser, size) {
  if (!(await proxyUp())) {
    console.log(`skip  ai/live-level1 (${size.name}): the ITP proxy is unreachable`);
    return { errors: [], longtasks: [] };
  }
  fs.mkdirSync(AI_OUT, { recursive: true });
  const { pathToFileURL } = require("node:url");
  const v2 = path.join(__dirname, "..", "v2");
  const { rewordable, keeps } = await import(pathToFileURL(path.join(v2, "engine", "reword.js")).href);
  const level = (await import(pathToFileURL(path.join(v2, "levels", "level-1.js")).href)).default;
  const lines = [...rewordable(level).values()];
  const tag = `${size.width}x${size.height}`;
  const { ctx, page, errors } = await open(browser, size, PROGRESS0);
  await ctx.addInitScript(() => { window.__dwAI = true; });
  const voices = [];
  // Ask, see the dots, wait for the line; check it against the written line it stands for.
  const speak = async (control, written, label) => {
    await press(page, size, control);
    await page.waitForSelector(".bubble--thinking", { timeout: 3000 });
    assert.equal(await page.locator(".bubble--thinking .bubble__dots span").count(), 3, "three thinking dots");
    if (label) await page.screenshot({ path: path.join(AI_OUT, `${tag}-${label}-thinking.png`) });
    await page.waitForSelector(".bubble--thinking", { state: "detached", timeout: 9000 });
    const text = (await page.textContent(".bubble__text")).trim();
    const voice = await page.getAttribute("main.level", "data-voice");
    const line = lines.find((l) => l.text === written);
    assert.ok(line, `a keep list for "${written}"`);
    if (voice === "ai") assert.ok(keeps(text, line.keep), `AI line keeps ${JSON.stringify(line.keep)}: "${text}"`);
    else assert.equal(text, written, "a fallback is the written line, word for word");
    voices.push({ phase: line.phase, voice, text });
    if (label) await page.screenshot({ path: path.join(AI_OUT, `${tag}-${label}.png`) });
  };
  const [sun, water, tom] = level.steps;
  // The same question twice (a fresh level each time): two different answers, usually.
  for (const n of [1, 2]) {
    await page.goto(`${BASE}?screen=level&level=level-1`);
    await page.waitForSelector(".dock .chip");
    await speak(page.getByRole("button", { name: sun.chip }), sun.reply, `sunflowers-${n}`);
  }
  await speak(page.getByRole("button", { name: "✓ Do it" }), sun.doneLine);
  await speak(page.getByRole("button", { name: water.chip }), water.reply);
  await speak(page.getByRole("button", { name: "✓ Do it" }), water.doneLine);
  await speak(page.getByRole("button", { name: tom.chip }), tom.reply, "drift");
  await press(page, size, page.getByRole("button", { name: "? Something's off" }));
  await phase(page, "name");
  await press(page, size, page.getByRole("button", { name: "It just agreed with me" }));
  await phase(page, "fix");
  await speak(page.getByRole("button", { name: "Tell me honestly if my idea is bad" }), tom.fixedReply, "fixed");
  await phase(page, "reanswer");
  await press(page, size, page.getByRole("button", { name: "✓ Do it" }));
  await phase(page, "reveal");
  fs.writeFileSync(path.join(AI_OUT, `${tag}-voices.json`), JSON.stringify(voices, null, 2));
  console.log(`      ${size.name}: ${voices.filter((v) => v.voice === "ai").length}/${voices.length} lines reworded by the AI`);
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
    runs.push([`${size.name}/level4-retry`, size, retryPath4], [`${size.name}/level5-retry`, size, retryPath5]);
    runs.push([`${size.name}/full`, size, fullRun]);
  }
  runs.push(["laptop/perfect", SIZES[0], perfectPath], ["small/landscape", SMALL, smallLandscape]);
  runs.push(["laptop/level5-tick", SIZES[0], tickPath5]);
  runs.push(["laptop/ending-locked", SIZES[0], endingLocked]);
  runs.push(["laptop/level1-disagree-mine", DISAGREE_LAPTOP, (b, s) => level1Disagree(b, s, "mine")]);
  runs.push(["phone/level1-disagree-mine", SIZES[1], (b, s) => level1Disagree(b, s, "mine")]);
  runs.push(["laptop/level1-disagree-theirs", DISAGREE_LAPTOP, (b, s) => level1Disagree(b, s, "theirs")]);
  runs.push(["phone/level1-disagree-theirs", SIZES[1], (b, s) => level1Disagree(b, s, "theirs")]);
  runs.push(["laptop/level5-water-everything", DISAGREE_LAPTOP, level5WaterEverything]);
  runs.push(["card/level1-fooled-mac", { name: "card-mac", ...CARD_SIZES[0] }, cardLevel1Fooled]);
  runs.push(["card/level1-fooled-phone", { name: "card-phone", ...CARD_SIZES[1], touch: true }, cardLevel1Fooled]);
  runs.push(["card/level1-fooled-small", { name: "card-small", ...CARD_SIZES[2], touch: true }, cardLevel1Fooled]);
  runs.push(["card/no-kickers", { name: "card-mac", ...CARD_SIZES[0] }, noKickers]);
  runs.push(["cutscene/watch-mac", CUT_SIZES.mac, cutsceneWatch], ["cutscene/watch-phone", CUT_SIZES.phone, cutsceneWatch], ["cutscene/watch-small", CUT_SIZES.small, cutsceneWatch]);
  runs.push(["cutscene/skip-escape", SIZES[0], cutsceneSkip], ["cutscene/block-titles", { name: "card-mac", ...CARD_SIZES[0] }, blockTitles]);
  runs.push(["mac/level1-caught", MAC, (b, s) => level1Path(b, s, "caught")], ["mac/level1-fooled", MAC, (b, s) => level1Path(b, s, "fooled")]);
  runs.push(["ai/live-level1", MAC, aiLiveLevel1], ["ai/live-level1-phone", SIZES[1], aiLiveLevel1]);
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
