// The phone HUD stays at the screen's right edge through play and rotation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8766/v2/';
const sizes = [[568, 320], [667, 375], [812, 375], [844, 390], [852, 393], [896, 414], [932, 430], [844, 290]];

async function checkHud(page) {
  await page.waitForFunction(() => !document.getAnimations().some(animation =>
    animation.playState === 'running' && animation.effect?.getTiming().iterations !== Infinity &&
    animation.effect?.target?.closest?.('.dock')));
  const metrics = await page.evaluate(() => {
    const box = (selector) => {
      const el = document.querySelector(selector);
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    };
    const tools = [...document.querySelectorAll('.tool')];
    return {
      width: innerWidth, height: innerHeight,
      pageWidth: document.documentElement.scrollWidth,
      pageHeight: document.documentElement.scrollHeight,
      meter: box('.meter'), almanac: box('[data-tool="almanac"]'), stall: box('.stall'),
      goal: box('.goal'),
      smallChatButtons: [...document.querySelectorAll('.dock button')]
        .filter(el => { const r = el.getBoundingClientRect(); return r.height > 0 && (r.width < 44 || r.height < 44); })
        .map(el => el.textContent),
      toolsReachable: tools.every(el => {
        const r = el.getBoundingClientRect();
        const target = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return el.contains(target) && r.width >= 44 && r.height >= 44;
      }),
      overflowingChat: [...document.querySelectorAll('.dock, .dock__talk, .phone__scroll, .phone__replies')]
        .filter(el => el.getBoundingClientRect().height > 0 && el.scrollHeight > el.clientHeight + 1)
        .map(el => ({ class: el.className, height: el.clientHeight, content: el.scrollHeight })),
    };
  });
  assert.ok(metrics.meter.left > metrics.width * 0.55, `Garden meter belongs at the far right: ${JSON.stringify(metrics)}`);
  assert.ok(metrics.almanac.left > metrics.width * 0.6, 'Almanac belongs at the far right');
  assert.ok(metrics.meter.right <= metrics.stall.left || metrics.stall.right <= metrics.meter.left || metrics.meter.bottom <= metrics.stall.top, 'HUD clears the helper header');
  assert.ok(metrics.toolsReachable, 'Every tool is an uncovered 44px touch target');
  assert.deepEqual(metrics.smallChatButtons, [], 'Chat buttons retain 44px touch targets');
  assert.ok(metrics.meter.width <= 96 && metrics.meter.height <= 40, 'Garden meter stays compact');
  assert.ok(metrics.goal.height <= 48, 'Goal box stays compact');
  assert.deepEqual(metrics.overflowingChat, [], 'Chat content fits without scrolling');
  assert.equal(metrics.pageWidth, metrics.width, 'No horizontal page scrolling');
  assert.equal(metrics.pageHeight, metrics.height, 'Game fits the browser height');
  for (const box of [metrics.meter, metrics.almanac]) {
    assert.ok(box.left >= 0 && box.top >= 0 && box.right <= metrics.width && box.bottom <= metrics.height, 'HUD stays in the viewport');
  }
}

async function playLevel(page, level) {
  const steps = await page.evaluate(async id => (await import('./levels/index.js')).LEVELS[`level-${id}`].steps, level);
  let index = 0;
  const tried = new Set();
  for (let turn = 0; turn < 80; turn++) {
    await page.waitForFunction(() => !document.querySelector('.act, .chore-wait'));
    const phase = await page.locator('main.level').getAttribute('data-phase');
    try { await checkHud(page); } catch (error) {
      await page.screenshot({ path: '/tmp/driftwood-phone-overflow.png' });
      console.error(`Level ${level}, step ${index}, phase ${phase}`, await page.locator('.dock').innerText());
      throw error;
    }
    if (phase === 'reveal') return;
    const step = steps[index];
    assert.ok(step, `Step ${index} exists in level ${level}, phase ${phase}`);
    if ((phase === 'name' || phase === 'fix') && !tried.has(`${index}-${phase}`)) {
      tried.add(`${index}-${phase}`);
      const correct = phase === 'name' ? step.correctFlaw : step.correctFix;
      const options = phase === 'name' ? step.flawOptions : step.fixOptions;
      for (const option of options.filter(option => option.id !== correct)) {
        await page.locator(`[data-fid="pick-${option.id}"]`).tap();
        try { await checkHud(page); } catch (error) {
          await page.screenshot({ path: '/tmp/driftwood-phone-overflow.png' });
          console.error(`Level ${level}, step ${index}, phase ${phase}, wrong ${option.id}`, await page.locator('.dock').innerText());
          throw error;
        }
      }
    }
    let selector;
    if (phase === 'ask') selector = '[data-fid="chip-0"]';
    if (phase === 'advice') {
      selector = step.kind === 'trust' ? (step.place ? '[data-fid^="place-"]' : '[data-fid="do"]') : '[data-fid="off"]';
      if (step.kind === 'trust') index++;
      if (step.kind === 'hook') index++;
    }
    if (phase === 'pushback') selector = '[data-fid="off"]';
    if (phase === 'name') selector = `[data-fid="pick-${step.correctFlaw}"]`;
    if (phase === 'fix') selector = `[data-fid="pick-${step.correctFix}"]`;
    if (phase === 'reanswer') { selector = '[data-fid="do"]'; index++; }
    assert.ok(selector, `Handled phase ${phase}`);
    await page.locator(`.dock ${selector}`).first().tap();
  }
  assert.fail(`Level ${level} reaches its result`);
}

(async () => {
  for (const engine of [chromium, webkit]) {
    const browser = await engine.launch({ headless: true, executablePath: engine === chromium ? process.env.CHROME_PATH : undefined });
    try {
      for (const [width, height] of sizes) {
        const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
        await context.addInitScript(fs.readFileSync(path.join(__dirname, 'test-mute.js'), 'utf8'));
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
        for (let level = 1; level <= 5; level++) {
          console.log(`Checking ${engine.name()} ${width}×${height} level ${level}`);
          await page.goto(`${BASE}?screen=level&level=level-${level}&ai=0`);
          await page.locator('main.level').waitFor();
          if (width >= 812) {
            await page.locator('main.level').evaluate(el => {
              el.style.setProperty('--phone-safe-left', '44px');
              el.style.setProperty('--phone-safe-right', '44px');
              el.style.setProperty('--phone-safe-bottom', '21px');
            });
          }
          await checkHud(page);
          await page.locator('[data-tool="almanac"]').tap();
          await page.locator('.almanac-dialog[open]').waitFor();
          if (width >= 812) {
            const book = await page.locator('.almanac').boundingBox();
            assert.ok(book.x >= 44 && book.x + book.width <= width - 44 && book.y + book.height <= height - 21, 'Almanac clears the notch and home indicator');
          }
          await page.locator('.almanac__close').tap();
          await page.locator('.almanac-dialog[open]').waitFor({ state: 'hidden' });
          await checkHud(page);
          if (width === 568 || height === 290) await playLevel(page, level);
        }
        // Resize the same mounted level across both breakpoints.
        await page.setViewportSize({ width: 390, height: 844 });
        await page.locator('.scene .meter').waitFor();
        await page.setViewportSize({ width, height });
        await page.locator('.level__hud > .meter').waitFor();
        await page.waitForFunction(() => document.documentElement.scrollHeight === innerHeight);
        await checkHud(page);
        assert.deepEqual(errors, [], 'No runtime errors');
        console.log(`PASS ${engine.name()} ${width}×${height}, all five levels and rotation`);
        await context.close();
      }
    } finally {
      await browser.close();
    }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
