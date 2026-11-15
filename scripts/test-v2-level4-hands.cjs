// Level 4 by hand (wave 2): every hands-on action played, no auto-finish.
// The first unit of each drag action is a real drag (mouse on the laptop, CDP
// touch on the phone) onto its director ring; the rest go by keyboard (Enter).
// Shots, including mid-animation frames (the tape running out, seeds dropping
// down the furrow, the pixel water stream), go to
// docs/agent-playtest/2026-11-v2-level4-wave2/.
//
// Runs (ONLY=laptop/fooled,phone/caught … to pick):
//   fooled  carrots in the front bed, pumpkins their way (back), Do it on the
//           drift: dig the labelled bed over. 1 star.
//   caught  carrots in the side bed, pumpkins MY way (side too: the crowded
//           case), stand firm, name it, fix it, then the lettuce goes in the
//           front bed by hand. 2 stars (one wrong name pick).
//   skip    every chore skipped: no stars, trust or garden bar change.
//
//   BASE_URL=http://127.0.0.1:8774/v2/ PLAYWRIGHT_MODULE=… CHROME_PATH=… node scripts/test-v2-level4-hands.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { actionIdle, dragTo, skipChore } = require("./v2-actions-helper.cjs");

const BASE = process.env.BASE_URL || "http://127.0.0.1:8774/v2/";
const OUT = process.env.EVIDENCE_DIR || path.join(__dirname, "..", "docs", "agent-playtest", "2026-11-v2-level4-wave2");
const MUTE = fs.readFileSync(path.join(__dirname, "test-mute.js"), "utf8");
const SIZES = [
  { name: "laptop", width: 1512, height: 830 },
  { name: "phone", width: 844, height: 390, touch: true },
  { name: "small", width: 568, height: 320, touch: true },
];
const PROGRESS4 = JSON.stringify({
  name: "Tester",
  levels: {
    "level-1": { stars: 3, fooled: false }, "level-2": { stars: 3, fooled: false }, "level-3": { stars: 1, fooled: true },
  },
  guide: [
    { levelId: "level-1", flaw: "Sycophancy", tip: "Ask for the downside.", fooled: false },
    { levelId: "level-2", flaw: "Hallucination", tip: "Check anything important against a real source.", fooled: false },
    { levelId: "level-3", flaw: "Reckless advice", tip: "For health or safety, ask a real expert.", fooled: true },
  ],
});
const BED = { front: "Front bed", side: "Side bed", back: "Back bed" };

async function open(browser, size) {
  const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height }, hasTouch: !!size.touch });
  await ctx.addInitScript(MUTE);
  await ctx.addInitScript(() => { window.__dwAutoAct = false; });
  await ctx.addInitScript((p) => { try { localStorage.setItem("dw2_progress", p); } catch (_) { /* fine */ } }, PROGRESS4);
  await ctx.addInitScript(() => {
    window.__longtasks = [];
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__longtasks.push(Math.round(e.duration)); }).observe({ type: "longtask", buffered: true }); } catch (_) { /* none */ }
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  return { ctx, page, errors };
}

const phase = (page, p) => page.waitForSelector(`main.level[data-phase="${p}"]`, { timeout: 15000 });
const press = async (page, size, loc) => { await loc.scrollIntoViewIfNeeded(); return size.touch ? loc.tap() : loc.click(); };
const shot = (page, size, run, label) => page.screenshot({ path: path.join(OUT, `${size.name}-${run}-${label}.png`) });
const garden = (page) => page.evaluate(() => document.querySelector("main.level")?.style.getPropertyValue("--garden") || document.querySelector("[data-garden]")?.dataset.garden || "");

// Every spot ring and the tool must sit on screen and not overlap each other
// so badly a finger can't tell them apart (rows stay readable on the phone).
async function assertRingsReadable(page, label) {
  const rings = await page.$$eval(".act__ring--spot", (els) => els.map((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }));
  const vw = page.viewportSize();
  for (const r of rings) {
    assert.ok(r.x >= -2 && r.y >= -2 && r.x + r.w <= vw.width + 2 && r.y + r.h <= vw.height + 2, `${label}: a spot ring is off screen ${JSON.stringify(r)}`);
  }
  for (let i = 0; i < rings.length; i++) for (let j = i + 1; j < rings.length; j++) {
    const a = rings[i], b = rings[j];
    const ox = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
    const oy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    assert.ok(ox * oy < 0.25 * a.w * a.h, `${label}: spot rings ${i} and ${j} overlap`);
  }
}

// The director's arrows never sit on the level's own controls and titles
// (Lucy reads an arrow over the title as a glitch).
async function assertArrowsClear(page, label) {
  const hits = await page.evaluate(() => {
    const hud = [...document.querySelectorAll("main.level .btn--map, main.level .goal, main.level .meter, main.level button.tool, main.level .bed__label")]
      .filter((e) => !e.closest(".act, .act-layer") && e.getClientRects().length);
    const out = [];
    for (const a of document.querySelectorAll(".act__arrow")) {
      const r = a.getBoundingClientRect();
      for (const h of hud) {
        const q = h.getBoundingClientRect();
        const ox = Math.min(r.right, q.right) - Math.max(r.left, q.left);
        const oy = Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top);
        if (ox > 4 && oy > 4) out.push(`${h.className || h.tagName}`);
      }
    }
    return out;
  });
  assert.deepEqual(hits, [], `${label}: a director arrow covers ${hits.join(", ")}`);
}

// Play the open action card to the end. Each new instruction gets a shot;
// the first unit of a drag kind is a real drag, and named kinds also get a
// mid-animation shot. Returns the kinds played, in order.
const MID = { measure: 450, "sow-row": 650, "water-row": 700, furrow: 350, dig: 350, cover: 400 };
async function playCard(page, size, run, tag, max = Infinity) {
  const kinds = [];
  let n = 0;
  let lastSay = "";
  await page.waitForSelector("main.level .act", { timeout: 15000 });
  while (await page.locator("main.level .act").count()) {
    await actionIdle(page, 10000);
    const card = page.locator("main.level .act");
    if (!(await card.count())) break;
    const kind = await card.getAttribute("data-kind");
    const say = (await page.locator(".act__say").textContent().catch(() => "")) || "";
    const fresh = say !== lastSay && !/^(Not the|Drop it|Hold the)/.test(say);
    if (fresh && kinds.length >= max) break; // the next card (a chore) is someone else's
    if (fresh) {
      if (n === 0) await page.waitForTimeout(300); // the card slides in
      lastSay = say;
      kinds.push(kind);
      n += 1;
      await assertRingsReadable(page, `${run}/${tag}/${kind}`);
      assert.doesNotMatch(say, /[{}$@]/, `instruction resolves: ${say}`);
      await assertArrowsClear(page, `${run}/${tag}/${kind}`);
      await shot(page, size, run, `${tag}-${n}-${kind}`);
    }
    const holding = await page.locator(".act__hold, .act__ring--hold, [data-hold]").count();
    const ring = page.locator(".act__ring").first();
    const mode = await page.evaluate(() => document.querySelector(".act__item")?.closest(".act")?.dataset.kind);
    if (fresh && !holding && ["measure", "furrow", "sow-row", "water-row", "cover", "plant", "poke", "firm", "dig", "collect"].includes(mode) && await ring.count()) {
      await dragTo(page, ".act__item", ".act__ring >> nth=0", { touch: !!size.touch });
    } else {
      const item = page.locator(".act__item");
      if (!(await item.count())) break;
      await item.focus();
      await page.keyboard.press("Enter");
    }
    if (fresh && MID[kind]) {
      await page.waitForTimeout(MID[kind]);
      await shot(page, size, run, `${tag}-${n}-${kind}-mid`);
    }
    await page.waitForTimeout(80);
  }
  return kinds;
}

async function seeWhatHappened(page, size) {
  const see = page.getByRole("button", { name: "See what happened →" });
  await see.waitFor({ timeout: 15000 });
  await press(page, size, see);
  await page.waitForSelector(".reveal", { timeout: 5000 });
}

async function enter(page, size) {
  await page.goto(`${BASE}?screen=map`);
  await page.waitForSelector(".plots");
  await press(page, size, page.locator('[data-level="level-4"]'));
  await page.waitForSelector("main.level");
}

async function carrots(page, size, run, bed) {
  await press(page, size, page.getByRole("button", { name: "Where should I sow the carrots?" }));
  await phase(page, "advice");
  await press(page, size, page.locator(`button.btn--place[data-fid="place-${bed}"]`));
  const kinds = await playCard(page, size, run, "2-carrots", 5);
  assert.deepEqual(kinds, ["measure", "furrow", "sow-row", "firm", "poke"], "carrots: measure, hoe, sow, pat, label");
  await page.waitForSelector(`[data-bed="${bed}"] [data-plant="carrot"].plant--sown`);
  // The label the player pushed in stands in the bed they chose, for the rest of the level.
  assert.equal(await page.locator('.act-marks [data-mark="label-carrot"]').count(), 1, "the carrot label stands in the bed");
  const inBed = await page.evaluate((b) => {
    const m = document.querySelector('.act-marks [data-mark="label-carrot"]').getBoundingClientRect();
    const r = document.querySelector(`[data-bed="${b}"]`).getBoundingClientRect();
    const x = m.x + m.width / 2;
    return x >= r.left && x <= r.right;
  }, bed);
  assert.ok(inBed, "the carrot label is in the chosen bed");
  // The furrow marks close over once the crop's own row shows: the bed stays uncrowded.
  await page.waitForFunction(() => !document.querySelector(".act-marks .l4-mark--sown, .act-marks .l4-mark--furrow, .act-marks .l4-guide"), null, { timeout: 6000 });
  // Chore: water the row in (pixel stream, then hold to soak).
  const water = await playCard(page, size, run, "3-water", 1);
  assert.deepEqual(water, ["water-row"]);
  await phase(page, "ask");
  await shot(page, size, run, "3-water-done");
}

async function pumpkins(page, size, run, way) {
  await press(page, size, page.getByRole("button", { name: "Where should the pumpkins go?" }));
  await phase(page, "advice");
  if (way === "mine") {
    await press(page, size, page.getByRole("button", { name: "? Something's off" }));
    await phase(page, "disagree");
    await press(page, size, page.getByRole("button", { name: "Side bed instead" }));
  } else {
    await press(page, size, page.getByRole("button", { name: "✓ Do it" }));
  }
  const kinds = await playCard(page, size, run, "4-pumpkins", 3);
  assert.deepEqual(kinds, ["cover", "plant", "poke"], "pumpkins: hills, seeds, label");
  const bed = way === "mine" ? "side" : "back";
  await page.waitForSelector(`[data-bed="${bed}"] [data-plant="pumpkin"]`);
  assert.equal(await page.locator('.act-marks [data-mark="label-pumpkin"]').count(), 1, "the pumpkin label stands");
  // Chore: blueberries into the basket.
  const harvest = await playCard(page, size, run, "5-harvest", 1);
  assert.deepEqual(harvest, ["collect"]);
  await phase(page, "ask");
  await shot(page, size, run, "5-harvest-done");
}

async function fooled(browser, size) {
  const run = "fooled";
  const { ctx, page, errors } = await open(browser, size);
  await enter(page, size);
  // The arrival chore starts by itself: pull the weeds (tap kind).
  const weeds = await playCard(page, size, run, "1-weeds", 1);
  assert.deepEqual(weeds, ["pull"]);
  await phase(page, "ask");
  await carrots(page, size, run, "front");
  await pumpkins(page, size, run, "theirs");
  await press(page, size, page.getByRole("button", { name: "Where should the lettuce go?" }));
  await page.waitForSelector('main.level[data-phase="advice"] .bubble--glitch');
  await shot(page, size, run, "6-drift-label-standing");
  await press(page, size, page.getByRole("button", { name: "✓ Do it" }));
  const dig = await playCard(page, size, run, "7-dig");
  assert.deepEqual(dig, ["dig"]);
  await page.waitForSelector('[data-bed="front"] [data-plant="carrot"].plant--dug');
  assert.equal(await page.locator('.act-marks [data-mark="label-carrot"]').count(), 1, "your label still stands over the dug bed");
  await shot(page, size, run, "7-dug");
  await seeWhatHappened(page, size);
  assert.equal(await page.getAttribute(".reveal__stars", "aria-label"), "1 of 3 stars");
  const out = { errors, longtasks: await page.evaluate(() => window.__longtasks) };
  await ctx.close();
  return out;
}

async function caught(browser, size) {
  const run = "caught";
  const { ctx, page, errors } = await open(browser, size);
  await enter(page, size);
  await playCard(page, size, run, "1-weeds", 1);
  await phase(page, "ask");
  await carrots(page, size, run, "side");
  await pumpkins(page, size, run, "mine");
  await shot(page, size, run, "5b-side-bed-carrots-and-pumpkins");
  await press(page, size, page.getByRole("button", { name: "Where should the lettuce go?" }));
  await page.waitForSelector('main.level[data-phase="advice"] .bubble--glitch');
  await press(page, size, page.getByRole("button", { name: "? Something's off" }));
  await phase(page, "pushback");
  await press(page, size, page.getByRole("button", { name: "No. I'm sure" }));
  await phase(page, "name");
  await press(page, size, page.getByRole("button", { name: "It made up a fact about plants" }));
  await page.waitForSelector(".hint");
  await press(page, size, page.getByRole("button", { name: "It remembered something I never said" }));
  await phase(page, "fix");
  await press(page, size, page.getByRole("button", { name: "Only go by what I actually told you. If you're not sure, ask me." }));
  await phase(page, "reanswer");
  await press(page, size, page.getByRole("button", { name: "✓ Do it" }));
  const kinds = await playCard(page, size, run, "7-lettuce");
  assert.deepEqual(kinds, ["plant", "poke", "water-row"], "lettuce: three drops, label, water in");
  await page.waitForSelector('[data-bed="front"] [data-plant="lettuce"].plant--growing');
  await page.waitForSelector('[data-bed="side"] [data-plant="carrot"].plant--growing');
  assert.equal(await page.locator('.act-marks [data-mark="label-lettuce"]').count(), 1, "the lettuce label stands");
  await shot(page, size, run, "7-lettuce-done");
  await seeWhatHappened(page, size);
  // Caught, but "my way" on the pumpkins (sprawled, no garden gain) and one
  // wrong name pick: 1 star, the same as without the hands-on actions.
  assert.equal(await page.getAttribute(".reveal__stars", "aria-label"), "1 of 3 stars");
  assert.match(await page.textContent(".reveal"), /trusted your own log/);
  const out = { errors, longtasks: await page.evaluate(() => window.__longtasks) };
  await ctx.close();
  return out;
}

// Skip every chore: the garden bar comes out exactly as without them.
const gardenText = (page) => page.evaluate(() => [...document.querySelectorAll("main.level *")].map((e) => e.childElementCount === 0 ? e.textContent : "").find((t) => /Garden \d+%/.test(t)) || "");
async function skipped(browser, size) {
  const run = "skip";
  const { ctx, page, errors } = await open(browser, size);
  await enter(page, size);
  await page.waitForSelector("main.level .act [data-act-skip]");
  const before = await gardenText(page);
  assert.match(before, /Garden 55%/);
  await skipChore(page);
  await phase(page, "ask");
  assert.equal(await gardenText(page), before, "skipping the weeds leaves the garden bar alone");
  await press(page, size, page.getByRole("button", { name: "Where should I sow the carrots?" }));
  await phase(page, "advice");
  await press(page, size, page.locator('button.btn--place[data-fid="place-front"]'));
  await playCard(page, size, run, "2-carrots", 5);
  await page.waitForSelector('[data-bed="front"] [data-plant="carrot"].plant--sown');
  const sown = await gardenText(page);
  await page.waitForSelector("main.level .act [data-act-skip]");
  await skipChore(page);
  await phase(page, "ask");
  assert.equal(await gardenText(page), sown, "skipping the watering leaves the garden bar alone");
  await shot(page, size, run, "3-water-skipped");
  const out = { errors, longtasks: await page.evaluate(() => window.__longtasks) };
  await ctx.close();
  return out;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ["--mute-audio"] });
  const runs = [];
  for (const size of SIZES) {
    runs.push([`${size.name}/fooled`, () => fooled(browser, size)]);
    runs.push([`${size.name}/caught`, () => caught(browser, size)]);
    runs.push([`${size.name}/skip`, () => skipped(browser, size)]);
  }
  const only = (process.env.ONLY || "").split(",").map((s) => s.trim()).filter(Boolean);
  let failed = 0;
  for (const [label, fn] of runs) {
    if (only.length && !only.includes(label)) continue;
    try {
      const { errors, longtasks } = await fn();
      assert.deepEqual(errors, [], `${label}: no JS errors`);
      const long = longtasks.filter((d) => d > 200);
      assert.deepEqual(long, [], `${label}: no long tasks over 200 ms`);
      console.log(`pass  ${label}  (long tasks: ${longtasks.length ? longtasks.join(",") : "none"})`);
    } catch (err) {
      failed += 1;
      console.log(`FAIL  ${label}\n${String(err.stack || err).split("\n").slice(0, 6).join("\n")}`);
    }
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
