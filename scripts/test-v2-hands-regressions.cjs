// Focused browser regressions for changing instructions and action recovery.
// Run against the local static server; see test-v2-actions.cjs for env vars.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const BASE = process.env.BASE_URL || "http://127.0.0.1:8766/v2/";
const OUT = process.env.EVIDENCE_DIR || path.join(__dirname, "..", "docs/agent-playtest/2026-11-15-hands-audit/regressions");

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH });
  try {
    for (const size of [{ width: 1512, height: 830 }, { width: 844, height: 390, touch: true }]) {
      const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height }, hasTouch: !!size.touch });
      await ctx.addInitScript(fs.readFileSync(path.join(__dirname, "test-mute.js"), "utf8"));
      await ctx.addInitScript(() => { window.__dwAutoAct = false; });
      const page = await ctx.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      if (process.env.ONLY !== "soak") {
        await page.goto(`${BASE}tests/actions-fixture.html?kind=cover&ai=0`);
        await page.locator('.act[data-kind="cover"] .act__item').waitFor();
        if (size.touch) await page.locator(".act__item").tap();
        else await page.locator(".act__item").click();
        assert.equal(await page.locator('.act__zone[data-zone="back"]').count(), 1, "tapping a draggable tool enables a tap destination");
        await page.screenshot({ path: path.join(OUT, `${size.width}x${size.height}-tap-target.png`) });
        const front = await page.locator('[data-bed="front"]').boundingBox();
        if (size.touch) await page.touchscreen.tap(front.x + front.width / 2, front.y + front.height * 0.7);
        else await page.mouse.click(front.x + front.width / 2, front.y + front.height * 0.7);
        assert.match(await page.locator(".act__say").textContent(), /Not the Front bed\. Tap the Back bed/);
        assert.equal(await page.locator(".act-mark--cover").count(), 0, "a wrong tap applies nothing");
        if (size.touch) await page.locator('.act__zone[data-zone="back"]').tap();
        else await page.locator('.act__zone[data-zone="back"]').click();
        await page.waitForSelector(".act", { state: "detached" });
        assert.equal(await page.locator(".act-mark--cover").count(), 1, "the chosen destination receives the net");
        console.log(`pass ${size.width}x${size.height} tap alternative and wrong target recovery`);
      }
      if (process.env.ONLY === "tap") { assert.deepEqual(errors, []); await ctx.close(); continue; }
      await page.goto(`${BASE}tests/actions-fixture.html?kind=pour&ai=0`);
      await page.locator(".act__zone").waitFor();
      if (size.touch) await page.locator(".act__zone").tap();
      else await page.locator(".act__zone").click();
      await page.waitForSelector('.act[data-mode="hold"]');
      await page.screenshot({ path: path.join(OUT, `${size.width}x${size.height}-soak.png`) });
      assert.equal(await page.locator(".act__say").textContent(), "Hold the Back bed until the ring fills", "the main instruction changes when pouring becomes holding");
      await page.locator(".act__item").focus();
      await page.keyboard.press("Enter");
      await page.waitForSelector(".act", { state: "detached" });
      assert.equal(await page.locator(".act__ghost, .act-layer").count(), 0, "finishing a soak cleans up its tools");
      await page.goto(`${BASE}tests/actions-fixture.html?kind=hold&ai=0`);
      await page.locator(".act__hold").waitFor();
      await page.waitForTimeout(350);
      const ring = await page.locator(".act__hold").boundingBox();
      const pt = { x: ring.x + ring.width / 2, y: ring.y + ring.height / 2 };
      assert.ok(await page.evaluate(({ x, y }) => !!document.elementFromPoint(x, y)?.closest(".act__hold"), pt), "the hold ring receives input instead of the dock");
      const cdp = size.touch ? await ctx.newCDPSession(page) : null;
      const down = async () => {
        if (cdp) await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [pt] });
        else { await page.mouse.move(pt.x, pt.y); await page.mouse.down(); }
      };
      const up = () => cdp ? cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }) : page.mouse.up();
      await down();
      await page.waitForTimeout(120);
      assert.match(await page.locator(".act__hold").getAttribute("class"), /is-holding/, "the hold target is reachable above the dock");
      await up();
      assert.match(await page.locator(".act__say").textContent(), /Keep holding/, "an early release leaves a clear retry prompt");
      await page.screenshot({ path: path.join(OUT, `${size.width}x${size.height}-hold-retry.png`) });
      await down();
      await page.waitForTimeout(1000);
      await up();
      await page.waitForSelector(".act", { state: "detached" });
      assert.deepEqual(errors, []);
      console.log(`pass ${size.width}x${size.height} soak instructions, keyboard completion, pointer hold and early release recovery`);
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exitCode = 1; });
