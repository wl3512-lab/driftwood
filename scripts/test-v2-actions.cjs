// v2 hands-on actions (v2/actions): a choice that changes the garden is done
// by hand before it lands. Real mouse drags on a laptop, real touch drags
// (CDP touch events) on a phone, a wrong drop that bounces back, the effect
// landing only after the drop, a multi-target water (number keys), a
// multi-spot berry pick, a chore between questions, Esc back to the choice,
// and the keyboard-only path (completeAction). No JS errors, no long tasks
// over 200 ms. Screenshots and a WebM of the Level 1 sunflower planting go
// to docs/agent-playtest/2026-11-v2-actions/.
//
//   PLAYWRIGHT_MODULE=/Users/lucyliu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright \
//   CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
//   node scripts/test-v2-actions.cjs
//
// Optional: BASE_URL (default http://127.0.0.1:8766/v2/), EVIDENCE_DIR,
// ONLY=<label substring>, VIDEO=0 to skip the recording.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { completeAction, actionIdle, dragTo, skipChore } = require("./v2-actions-helper.cjs");

const BASE = process.env.BASE_URL || "http://127.0.0.1:8766/v2/";
const OUT = process.env.EVIDENCE_DIR || path.join(__dirname, "..", "docs", "agent-playtest", "2026-11-v2-actions");
const MUTE = fs.readFileSync(path.join(__dirname, "test-mute.js"), "utf8");
const MAC = { name: "1512x830", width: 1512, height: 830 };
const PHONE = { name: "844x390", width: 844, height: 390, touch: true };
const SMALL = { name: "568x320", width: 568, height: 320, touch: true };
const LONGTASK_LIMIT_MS = 200;
const PROGRESS = JSON.stringify({
  name: "Tester",
  levels: { "level-1": { stars: 3, fooled: false }, "level-2": { stars: 3, fooled: false } },
  guide: [],
  // Rowan's seed handoff is covered in test-v2-levels.cjs; these runs start in the level.
  handoffSeen: ["level-1", "level-2", "level-3", "level-4", "level-5"],
});

async function open(browser, size, { video = null } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: size.width, height: size.height }, hasTouch: !!size.touch,
    ...(video ? { recordVideo: { dir: video, size: { width: size.width, height: size.height } } } : {}),
  });
  await ctx.addInitScript(MUTE);
  await ctx.addInitScript((p) => {
    window.__dwAutoAct = false; // these runs do every action by hand
    try {
      localStorage.setItem("dw2_progress", p);
      for (let i = 1; i <= 5; i++) localStorage.setItem(`dw2_almanac_hint_level-${i}`, "1");
    } catch (_) { /* fine */ }
    window.__longtasks = [];
    try {
      new PerformanceObserver((list) => { for (const e of list.getEntries()) window.__longtasks.push(Math.round(e.duration)); })
        .observe({ type: "longtask", buffered: true });
    } catch (_) { /* unsupported: none */ }
  }, PROGRESS);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  return { ctx, page, errors };
}

const press = (page, size, sel) => (size.touch ? page.locator(sel).first().tap() : page.locator(sel).first().click());
const shot = (page, size, name) => page.screenshot({ path: path.join(OUT, `${size.name}-${name}.png`) });
const garden = (page) => page.locator(".meter__text").textContent();
const fields = (page, bed, plant) => page.locator(`[data-bed="${bed}"] [data-field="${plant}"]`).count();
const say = (page) => page.locator(".act__say").textContent();
const auto = (page, on) => page.evaluate((v) => { window.__dwAutoAct = v; }, on);

async function level(page, id) {
  await page.goto(`${BASE}?screen=level&level=${id}`);
  // A level can open on a chore (Level 1 clears stones first): skip it.
  await page.waitForSelector("main.level .chip, main.level .act [data-act-skip]");
  while (!(await page.locator("main.level .chip").count())) {
    await skipChore(page);
    await page.waitForSelector("main.level .chip, main.level .act [data-act-skip]");
  }
}

// Finish, by keyboard, every move of the open action while it is of this kind.
async function finishKind(page, kind) {
  await page.waitForSelector(`main.level .act[data-kind="${kind}"]`, { timeout: 6000 });
  while (await page.locator(`main.level .act[data-kind="${kind}"]`).count()) {
    await actionIdle(page);
    const item = page.locator(`main.level .act[data-kind="${kind}"] .act__item`);
    if (!(await item.count())) break;
    await item.focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(60);
    await actionIdle(page).catch(() => {});
  }
}
// Level 1 plants by hand: dig, then the packet, then firm and a cane.
const digFirst = (page) => finishKind(page, "dig");
const firmAndStake = async (page) => { await finishKind(page, "firm"); await finishKind(page, "poke"); };

// Level 1, sunflowers: Do it → the packet and the director, a wrong drop,
// then the right drop; the garden changes only after the sprinkle.
async function plantSunflowers(page, size, { shots = true } = {}) {
  await press(page, size, '[data-fid="chip-0"]');
  await press(page, size, '[data-fid="do"]');
  await digFirst(page);
  await page.waitForSelector('.act[data-kind="plant"] .act__item .pk[data-plant="sunflower"]');
  assert.match(await say(page), /sunflower packet to the South bed/);
  assert.equal(await page.locator('.act__arrow[data-target="south"]').count(), 1, "the arrow marks the South bed");
  assert.equal(await fields(page, "south", "sunflower"), 0, "nothing planted yet");
  assert.equal(await garden(page), "Garden 30%");
  const live = await page.locator(".act [aria-live]").textContent();
  assert.match(live, /South bed/, "the instruction is announced");
  await page.waitForTimeout(450);
  if (shots) await shot(page, size, "packet-director");

  // Wrong bed: bounces back with a nudge, nothing lands.
  await dragTo(page, ".act__item", '[data-bed="east"]', { touch: size.touch });
  await page.waitForTimeout(350);
  assert.match(await say(page), /Not the East bed\. Try the South bed/);
  assert.equal(await page.locator(".act__ghost").count(), 0, "the dragged packet went back");
  assert.equal(await fields(page, "south", "sunflower"), 0);
  assert.equal(await page.locator('.act[data-kind="plant"]').count(), 1, "still the same action");
  if (shots) await shot(page, size, "wrong-drop");

  // Right bed: mid-drag the ring lights up, then the seeds sprinkle.
  const up = await dragTo(page, ".act__item", '[data-bed="south"]', { touch: size.touch, release: false });
  assert.equal(await page.locator(".act__ghost").count(), 1, "the packet is lifted above everything");
  const z = await page.locator(".act__ghost").evaluate((g) => Number(getComputedStyle(g).zIndex));
  assert.ok(z >= 1000, "the dragged tool sits above the dock");
  assert.equal(await page.locator(".act__ring.is-hot").count(), 1, "the target lights up under the packet");
  if (shots) await shot(page, size, "mid-drag");
  await up();
  await page.waitForTimeout(80);
  assert.equal(await fields(page, "south", "sunflower"), 0, "the effect waits for the animation");
  assert.equal(await garden(page), "Garden 30%");
  await page.waitForTimeout(560);
  if (shots) await shot(page, size, "seed-sprinkle");
  assert.ok(await page.locator(".act__fx").count() > 0, "seeds are falling");
  await page.waitForSelector('.act[data-kind="plant"]', { state: "detached", timeout: 6000 });
  await firmAndStake(page);
  assert.equal(await fields(page, "south", "sunflower"), 1, "planted after the drop");
  assert.equal(await garden(page), "Garden 45%");
  assert.equal(await page.locator(".act__fx, .act__ghost").count(), 0, "no sprites left behind");
  assert.ok(await page.locator(".act-layer").count() <= 1, "one director layer at most (the chore's)");
}

// The chore between steps 1 and 2: three weeds to tap. No garden change.
async function weedChore(page, size, { shots = true } = {}) {
  await page.waitForSelector('.act[data-kind="pull"]');
  assert.equal(await page.locator(".act__title").textContent(), "Chore");
  assert.match(await say(page), /weeds out of the East bed/);
  assert.equal(await page.locator(".act__back").count(), 0, "a chore can't be backed out of");
  assert.equal(await page.locator(".act [data-act-skip]").count(), 1, "a chore can be skipped");
  assert.equal(await page.locator(".chip").count(), 0, "no questions until the chore is done");
  assert.equal(await page.locator(".act__spot").count(), 3);
  await page.waitForTimeout(400);
  if (shots) await shot(page, size, "chore");
  const g = await garden(page);
  for (let i = 0; i < 3; i++) {
    await press(page, size, ".act__spot");
    await page.waitForTimeout(50);
    await actionIdle(page);
    if (i < 2) assert.match(await page.locator(".act__count").textContent(), new RegExp(`${i + 1}/3`));
  }
  await page.waitForSelector(".act", { state: "detached" });
  assert.match(await page.locator(".bubble__text").first().textContent(), /Look at them GO/, "Mango's line stays put");
  assert.equal(await garden(page), g, "chores never change the score");
  await page.waitForSelector('.chip[data-fid="chip-0"]');
}

const RUNS = [];
const run = (label, fn) => RUNS.push({ label, fn });

for (const size of [MAC, PHONE]) {
  run(`${size.name}/plant-drag`, async (browser) => {
    const t = await open(browser, size);
    await level(t.page, "level-1");
    await plantSunflowers(t.page, size);
    await weedChore(t.page, size);
    // Water: two beds; number key 2 waters the East bed first, then the rest by keyboard.
    await press(t.page, size, '[data-fid="chip-0"]');
    await press(t.page, size, '[data-fid="do"]');
    await finishKind(t.page, "hold"); // the finger test, then filling the can
    await t.page.waitForSelector('.act[data-kind="water"]');
    assert.equal(await t.page.locator(".act__arrow").count(), 2, "an arrow over each bed to water");
    assert.match(await say(t.page), /South bed and the East bed/);
    await t.page.keyboard.press("2");
    await t.page.waitForTimeout(820);
    await shot(t.page, size, "water-pour");
    await actionIdle(t.page);
    assert.match(await t.page.locator(".act__count").textContent(), /1\/2/);
    assert.equal(await t.page.locator(".act__arrow").count(), 1, "the watered bed's arrow is gone");
    assert.equal(await t.page.locator("main.level").getAttribute("data-phase"), "advice", "not applied until every bed is watered");
    await completeAction(t.page); // the watering, then the lettuce harvest chore
    assert.match(await t.page.locator(".bubble__text").first().textContent(), /Hydrated|Salad/);
    return t;
  });

  // Level 3's blueberries, Do it: pick the four ripe berries one by one; the
  // step applies only after the fourth. (The wild-berry drift has no pick:
  // the game never acts out eating them.)
  run(`${size.name}/multi-pick`, async (browser) => {
    const t = await open(browser, size);
    await level(t.page, "level-3");
    await auto(t.page, true); // the aphids step and its chores finish by themselves
    await press(t.page, size, '[data-fid="chip-0"]');
    await press(t.page, size, '[data-fid="do"]');
    await t.page.waitForFunction(() => /berr/i.test(document.querySelector('main.level[data-phase="ask"] .chip[data-fid="chip-0"]')?.textContent || ""), null, { timeout: 30000 });
    await auto(t.page, false);
    await press(t.page, size, '[data-fid="chip-0"]');
    await press(t.page, size, '[data-fid="do"]');
    await t.page.waitForSelector('.act[data-kind="pick"]');
    assert.equal(await t.page.locator(".act__spot").count(), 4);
    await t.page.waitForTimeout(400);
    await shot(t.page, size, "multi-pick");
    for (let i = 0; i < 4; i++) {
      assert.equal(await t.page.locator("main.level").getAttribute("data-phase"), "advice", "applied only after the last berry");
      await press(t.page, size, ".act__spot");
      await t.page.waitForTimeout(50);
      await actionIdle(t.page);
    }
    await t.page.waitForSelector('.act[data-kind="pick"]', { state: "detached" });
    return t;
  });
}

// Keyboard only: disagree → my way (Shady corner) by completeAction; Esc
// backs out of an action to the choice; the reanswer's tomato goes in by keys.
run("1512x830/keyboard", async (browser) => {
  const t = await open(browser, MAC);
  const { page } = t;
  await level(page, "level-1");
  await page.locator('[data-fid="chip-0"]').focus();
  await page.keyboard.press("Enter");
  await page.locator('[data-fid="off"]').focus();
  await page.keyboard.press("Enter");
  await page.waitForSelector('[data-choice="mine"]');
  await page.locator('[data-choice="mine"]').focus();
  await page.keyboard.press("Enter");
  await page.waitForSelector('.act[data-kind="dig"]');
  assert.equal(await page.evaluate(() => document.activeElement?.matches(".act__item")), true, "focus goes to the tool");
  assert.match(await say(page), /Shady corner/);
  // Esc: back to the choice, nothing planted.
  await page.keyboard.press("Escape");
  await page.waitForSelector('[data-choice="mine"]');
  assert.equal(await fields(page, "corner", "sunflower"), 0);
  await page.locator('[data-choice="mine"]').focus();
  await page.keyboard.press("Enter");
  await completeAction(page); // dig, sow, firm, stake, then the weeding chore that follows
  assert.equal(await fields(page, "corner", "sunflower"), 1);
  assert.equal(await page.locator(".act").count(), 0);
  await page.waitForSelector('.chip[data-fid="chip-0"]');
  return t;
});

// A skipped chore: gone at once, nothing animates, the score is untouched,
// and the next question comes up.
run("1512x830/skip-chore", async (browser) => {
  const t = await open(browser, MAC);
  const { page } = t;
  await level(page, "level-1");
  await press(page, MAC, '[data-fid="chip-0"]');
  await press(page, MAC, '[data-fid="do"]');
  await digFirst(page);
  await finishKind(page, "plant");
  await firmAndStake(page); // the chore opens right after
  await page.waitForSelector('.act[data-kind="pull"] [data-act-skip]');
  const g = await garden(page);
  await skipChore(page);
  assert.equal(await garden(page), g, "skipping never changes the garden bar");
  assert.equal(await page.locator(".act__fx, .act-layer").count(), 0, "no animation left running");
  await page.waitForSelector('.chip[data-fid="chip-0"]');
  assert.match(await page.locator('.chip[data-fid="chip-0"]').textContent(), /water/i, "on to the next question");
  return t;
});

// Small phone: the card fits beside the garden and touch drag still plants.
run("568x320/touch", async (browser) => {
  const t = await open(browser, SMALL);
  await level(t.page, "level-1");
  await press(t.page, SMALL, '[data-fid="chip-0"]');
  await press(t.page, SMALL, '[data-fid="do"]');
  await digFirst(t.page);
  await t.page.waitForSelector('.act[data-kind="plant"] .act__item');
  await t.page.waitForTimeout(400);
  await shot(t.page, SMALL, "packet-director");
  const fit = await t.page.evaluate(() => {
    const r = (s) => document.querySelector(s).getBoundingClientRect();
    return { item: r(".act__item"), say: r(".act__say"), vw: innerWidth, vh: innerHeight };
  });
  assert.ok(fit.item.bottom <= fit.vh && fit.item.right <= fit.vw && fit.item.top >= 0, `the tool is on screen ${JSON.stringify(fit)}`);
  assert.ok(fit.say.width >= 100, `the instruction has room to read ${JSON.stringify(fit.say)}`);
  await dragTo(t.page, ".act__item", '[data-bed="south"]', { touch: true });
  await t.page.waitForSelector('.act[data-kind="plant"]', { state: "detached", timeout: 6000 });
  await firmAndStake(t.page);
  assert.equal(await fields(t.page, "south", "sunflower"), 1);
  return t;
});

// ---- wave 1.5: one run per shared kind, on the test level (v2/tests/fixtures/actions-level.js) ----
// Dev server only: the build leaves v2/tests/ out.
const FIXTURE = (kind) => `${BASE}tests/actions-fixture.html?kind=${kind}`;
async function fixtureKind(browser, size, kind) {
  const t = await open(browser, size);
  await t.page.goto(FIXTURE(kind));
  const card = kind === "mixed" ? ".act[data-kind=\"fill\"]" : `.act[data-kind="${kind}"]`;
  await t.page.waitForSelector(card, { timeout: 10000 }).catch(async (e) => {
    throw new Error(`${kind}: no chore card. Page errors: ${JSON.stringify(t.errors)}. App: ${(await t.page.locator("#app").innerText().catch(() => "?")).slice(0, 200)}\n${e.message}`);
  });
  await t.page.waitForTimeout(300);
  return t;
}
// Press and hold an element for ms (mouse, or a CDP touch for touch sizes).
async function holdOn(page, sel, ms) {
  const b = await page.locator(sel).first().boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}
const marks = (page, sel) => page.locator(`.act-marks ${sel}`).count();
const gone = (page) => page.waitForSelector(".act", { state: "detached", timeout: 8000 });
const KIND_RUNS = {
  async pull(page, size) {
    assert.match(await say(page), /Pull the 3 weeds out of the Front bed/);
    for (let i = 0; i < 3; i++) {
      await press(page, size, ".act__spot");
      if (i === 0) { await page.waitForTimeout(180); await shot(page, size, "fixture-pull"); }
      await actionIdle(page);
    }
  },
  async snip(page, size) {
    assert.match(await say(page), /Snip the 2 basil tips on the Front bed/);
    for (let i = 0; i < 2; i++) {
      await press(page, size, ".act__spot");
      if (i === 0) { await page.waitForTimeout(200); await shot(page, size, "fixture-snip"); }
      await actionIdle(page);
    }
  },
  async fill(page, size) {
    assert.match(await page.locator('[data-prop="pot"]').getAttribute("src"), /l2-pot-empty/);
    assert.match(await say(page), /trowel to the sill pot/);
    await dragTo(page, ".act__item", '[data-prop="basket"]', { touch: size.touch });
    await actionIdle(page);
    assert.match(await say(page), /Not the basket\. Try the sill pot/, "a wrong drop names both");
    await dragTo(page, ".act__item", '[data-prop="pot"]', { touch: size.touch });
    await page.waitForTimeout(450);
    await shot(page, size, "fixture-fill");
    await gone(page);
    assert.match(await page.locator('[data-prop="pot"]').getAttribute("src"), /l2-pot-soil/, "the pot shows its filled art");
  },
  async pour(page, size) {
    assert.match(await say(page), /then hold to soak it/);
    await dragTo(page, ".act__item", '[data-bed="back"]', { touch: size.touch });
    await page.waitForSelector(".act__hold", { timeout: 6000 });
    await holdOn(page, ".act__hold", 150);
    assert.match(await say(page), /Keep holding/, "letting go early resets the ring");
    await page.waitForTimeout(100);
    const b = await page.locator(".act__hold").boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(420);
    await shot(page, size, "fixture-pour-soak");
    await page.waitForTimeout(500);
    await page.mouse.up();
  },
  async cover(page, size) {
    await dragTo(page, ".act__item", '[data-bed="back"]', { touch: size.touch });
    await page.waitForTimeout(500);
    await shot(page, size, "fixture-cover");
    await gone(page);
    assert.equal(await marks(page, ".act-mark--cover"), 1, "the net stays over the bed");
  },
  async collect(page, size) {
    assert.match(await say(page), /Drag 2 berry ripes into the basket|Drag 2 .* into the basket/);
    for (let i = 0; i < 2; i++) {
      await dragTo(page, ".act__item", '[data-prop="basket"]', { touch: size.touch });
      if (i === 0) { await page.waitForTimeout(300); await shot(page, size, "fixture-collect"); }
      await actionIdle(page);
    }
  },
  async poke(page, size) {
    assert.match(await say(page), /cane into the first row/);
    await dragTo(page, ".act__item", ".act__ring", { touch: size.touch });
    await gone(page);
    assert.equal(await marks(page, ".act-mark--stand"), 1, "the cane stays standing");
    assert.match(await page.locator(".act-marks").textContent(), /Dry 2 cm down/);
    await shot(page, size, "fixture-poke");
  },
  async hold(page, size) {
    assert.match(await say(page), /Press and hold the porch step/);
    await holdOn(page, ".act__hold", 120);
    assert.match(await say(page), /Keep holding/);
    const b = await page.locator(".act__hold").boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(380);
    await shot(page, size, "fixture-hold");
    await page.waitForTimeout(500);
    await page.mouse.up();
    await gone(page);
    assert.match(await page.locator(".act-marks").textContent(), /Damp: leave it/);
  },
};
for (const kind of Object.keys(KIND_RUNS)) {
  run(`1512x830/kind-${kind}`, async (browser) => {
    const t = await fixtureKind(browser, MAC, kind);
    const g = await garden(t.page);
    await KIND_RUNS[kind](t.page, MAC);
    await gone(t.page);
    assert.equal(await garden(t.page), g, "a chore never moves the garden bar");
    await t.page.waitForSelector(".chip");
    return t;
  });
}
// Keyboard and auto runs reach the same end state, soak and hold included.
run("1512x830/kind-keyboard", async (browser) => {
  for (const kind of ["pour", "hold", "poke", "fill"]) {
    const t = await fixtureKind(browser, MAC, kind);
    await completeAction(t.page);
    await gone(t.page);
    if (kind === "hold") assert.match(await t.page.locator(".act-marks").textContent(), /Damp/);
    if (kind === "fill") assert.match(await t.page.locator('[data-prop="pot"]').getAttribute("src"), /l2-pot-soil/);
    assert.deepEqual(t.errors, [], `${kind}: no JS errors`);
    await t.ctx.close();
  }
  const t = await fixtureKind(browser, MAC, "mixed");
  await completeAction(t.page);
  assert.match(await t.page.locator('[data-prop="jar"]').getAttribute("src"), /l2-jar\.svg/);
  return t;
});
// Skip lands the end state too (a filled pot, a standing cane), and is plain text, not a gold button.
run("1512x830/kind-skip", async (browser) => {
  const t = await fixtureKind(browser, MAC, "poke");
  const look = await t.page.locator("[data-act-skip]").evaluate((el) => {
    const cs = getComputedStyle(el);
    return { bg: cs.backgroundColor, border: cs.borderTopWidth, deco: cs.textDecorationLine };
  });
  assert.equal(look.bg, "rgba(0, 0, 0, 0)", `Skip has no fill ${JSON.stringify(look)}`);
  assert.equal(look.deco, "underline");
  await shot(t.page, MAC, "fixture-skip-quiet");
  await skipChore(t.page);
  assert.equal(await marks(t.page, ".act-mark--stand"), 1);
  return t;
});
// Phone landscape, touch: the small prop and spot targets take a finger.
run("844x390/kind-touch", async (browser) => {
  const t = await fixtureKind(browser, PHONE, "fill");
  await dragTo(t.page, ".act__item", '[data-prop="pot"]', { touch: true });
  await gone(t.page);
  await t.ctx.close();
  const u = await fixtureKind(browser, PHONE, "poke");
  await dragTo(u.page, ".act__item", ".act__ring", { touch: true });
  await gone(u.page);
  await shot(u.page, PHONE, "fixture-poke");
  return u;
});

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ["--use-angle=metal"] });
  const only = process.env.ONLY;
  let failed = 0;
  for (const r of RUNS) {
    if (only && !r.label.includes(only)) continue;
    let t = null;
    try {
      t = await r.fn(browser);
      const long = await t.page.evaluate(() => window.__longtasks.filter((d) => d > 200));
      assert.deepEqual(t.errors, [], "no JS errors");
      assert.deepEqual(long, [], `long tasks over ${LONGTASK_LIMIT_MS} ms`);
      console.log(`pass  ${r.label}  (long tasks: none)`);
    } catch (e) {
      failed++;
      console.log(`FAIL  ${r.label}\n${String(e.stack || e).split("\n").slice(0, 6).map((l) => `   ${l}`).join("\n")}`);
    } finally {
      await t?.ctx.close();
    }
  }
  // The recording: Level 1's sunflowers planted with a slow mouse drag.
  if (process.env.VIDEO !== "0" && (!only || "video".includes(only))) {
    const dir = path.join(OUT, ".video-tmp");
    const t = await open(browser, MAC, { video: dir });
    try {
      await level(t.page, "level-1");
      await t.page.waitForTimeout(700);
      await t.page.locator('[data-fid="chip-0"]').click();
      await t.page.waitForTimeout(1200);
      await t.page.locator('[data-fid="do"]').click();
      await digFirst(t.page);
      await t.page.waitForSelector('.act[data-kind="plant"] .act__item');
      await t.page.waitForTimeout(1200);
      await dragTo(t.page, ".act__item", '[data-bed="south"]', { steps: 45 });
      await t.page.waitForSelector('.act[data-kind="plant"]', { state: "detached", timeout: 6000 });
      await t.page.waitForTimeout(1800);
      console.log("pass  video");
    } catch (e) {
      failed++;
      console.log(`FAIL  video\n   ${e}`);
    }
    const video = t.page.video();
    await t.ctx.close();
    if (video) {
      const target = path.join(OUT, "1512x830-level1-sunflower-planting.webm");
      await video.saveAs(target);
      await video.delete();
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`video → ${path.relative(process.cwd(), target)}`);
    }
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
