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
  await page.waitForSelector("main.level .chip");
}

// Level 1, sunflowers: Do it → the packet and the director, a wrong drop,
// then the right drop; the garden changes only after the sprinkle.
async function plantSunflowers(page, size, { shots = true } = {}) {
  await press(page, size, '[data-fid="chip-0"]');
  await press(page, size, '[data-fid="do"]');
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
  assert.equal(await fields(page, "south", "sunflower"), 1, "planted after the drop");
  assert.equal(await garden(page), "Garden 45%");
  assert.equal(await page.locator(".act__fx, .act__ghost").count(), 0, "no sprites left behind");
  assert.ok(await page.locator(".act-layer").count() <= 1, "one director layer at most (the chore's)");
}

// The chore between steps 1 and 2: three weeds to tap. No garden change.
async function weedChore(page, size, { shots = true } = {}) {
  await page.waitForSelector('.act[data-kind="pick"]');
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
    await completeAction(t.page);
    assert.match(await t.page.locator(".bubble__text").first().textContent(), /Hydrated/);
    return t;
  });

  // Level 3's drift, taken: pick each of the three wild berries; the level
  // ends fooled only after the third.
  run(`${size.name}/multi-pick`, async (browser) => {
    const t = await open(browser, size);
    await level(t.page, "level-3");
    await auto(t.page, true); // the first two steps' actions finish by themselves
    for (let i = 0; i < 2; i++) {
      await press(t.page, size, '[data-fid="chip-0"]');
      await press(t.page, size, '[data-fid="do"]');
      await t.page.waitForSelector(`main.level[data-phase="ask"]`);
      await t.page.waitForFunction((n) => document.querySelector(".meter__text")?.textContent !== n, "", { timeout: 2000 }).catch(() => {});
    }
    await auto(t.page, false);
    await press(t.page, size, '[data-fid="chip-0"]');
    await press(t.page, size, '[data-fid="do"]');
    await t.page.waitForSelector('.act[data-kind="pick"]');
    assert.equal(await t.page.locator(".act__spot").count(), 3);
    await t.page.waitForTimeout(400);
    await shot(t.page, size, "multi-pick");
    for (let i = 0; i < 3; i++) {
      assert.equal(await t.page.locator("main.level").getAttribute("data-phase"), "advice", "fooled only after the last berry");
      await press(t.page, size, ".act__spot");
      await t.page.waitForTimeout(50);
      await actionIdle(t.page);
    }
    await t.page.waitForSelector('main.level[data-phase="reveal"]');
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
  await page.waitForSelector('.act[data-kind="plant"]');
  assert.equal(await page.evaluate(() => document.activeElement?.matches(".act__item")), true, "focus goes to the tool");
  assert.match(await say(page), /to the Shady corner/);
  // Esc: back to the choice, nothing planted.
  await page.keyboard.press("Escape");
  await page.waitForSelector('[data-choice="mine"]');
  assert.equal(await fields(page, "corner", "sunflower"), 0);
  await page.locator('[data-choice="mine"]').focus();
  await page.keyboard.press("Enter");
  await completeAction(page); // the planting, then the weeding chore that follows it
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
  await page.locator(".act__item").focus();
  await page.keyboard.press("Enter"); // the planting, by keyboard; the chore opens right after
  await page.waitForSelector('.act[data-kind="pick"] [data-act-skip]');
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
  await t.page.waitForSelector(".act__item");
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
  assert.equal(await fields(t.page, "south", "sunflower"), 1);
  return t;
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
      await t.page.waitForSelector(".act__item");
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
