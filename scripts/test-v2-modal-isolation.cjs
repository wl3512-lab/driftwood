// Regression: native almanac modal must isolate all background level shortcuts.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8766/v2/';
const OUT = process.env.EVIDENCE_DIR || path.join(__dirname, '../docs/agent-playtest/2026-11-15-ui-audit');
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH });
  try {
    for (const [width, height] of [[1512, 830], [844, 390], [390, 844], [375, 667]]) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', serviceWorkers: 'block' });
      await context.addInitScript(fs.readFileSync(path.join(__dirname, 'test-mute.js'), 'utf8'));
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('requestfailed', r => console.log('FAILED RESOURCE', r.url(), r.failure()));
      await page.goto(`${BASE}?screen=level&level=level-3&ai=0`);
      await page.locator('main.level .chip').first().waitFor().catch(async error => { console.log('LOAD FAILED', await page.locator('body').innerText(), errors); throw error; });
      await page.keyboard.press('/');
      await page.locator('.almanac-dialog[open]').waitFor();
      await page.keyboard.press('m');
      assert.equal(await page.locator('main.level').evaluate(el => el.classList.contains('is-magnifying')), false, 'M must not activate a background tool while reading');
      await page.keyboard.press('Escape');
      await page.locator('.almanac-dialog[open]').waitFor({ state: 'detached' });
      assert.equal(await page.locator('[data-tool="almanac"]').evaluate(el => el === document.activeElement), true, 'closing returns focus to the almanac button');
      await page.keyboard.press('m');
      assert.equal(await page.locator('main.level').evaluate(el => el.classList.contains('is-magnifying')), true, 'M still works after the modal closes');
      // Opening the book during magnify mode must leave that background
      // mode intact when Escape closes only the book.
      await page.keyboard.press('/');
      await page.locator('.almanac-dialog[open]').waitFor();
      await page.keyboard.press('Escape');
      await page.locator('.almanac-dialog[open]').waitFor({ state: 'detached' });
      assert.equal(await page.locator('main.level').evaluate(el => el.classList.contains('is-magnifying')), true, 'Escape closes only almanac, preserving background magnify mode');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('main.level').evaluate(el => el.classList.contains('is-magnifying')), false, 'next Escape exits magnify mode');
      await page.keyboard.press('/');
      await page.locator('.pk[data-plant="blueberry"]').click();
      await page.locator('[data-flipback]').waitFor();
      await page.keyboard.press('Escape');
      await page.locator('[data-flipback]').waitFor({ state: 'detached' });
      assert.equal(await page.locator('.almanac-dialog[open]').count(), 1, 'first Escape returns the packet to shelf');
      await page.screenshot({ path: path.join(OUT, `${width}x${height}-almanac-after.png`) });
      await page.keyboard.press('Escape');
      await page.locator('.almanac-dialog[open]').waitFor({ state: 'detached' });
      assert.deepEqual(errors, [], 'no page errors during keyboard navigation');
      // Reading during a chore must not perform the hidden numbered action.
      await page.addInitScript(() => { window.__dwAutoAct = false; });
      await page.goto(`${BASE}?screen=level&level=level-4&ai=0`);
      await page.locator('.act__count').waitFor();
      const countBefore = await page.locator('.act__count').innerText();
      await page.keyboard.press('/');
      await page.locator('.almanac-dialog[open]').waitFor();
      await page.keyboard.press('1');
      await page.waitForTimeout(700);
      assert.equal(await page.locator('.act__count').innerText(), countBefore, 'number keys cannot perform hidden chores while reading');
      await page.keyboard.press('Escape');
      await page.locator('.almanac-dialog[open]').waitFor({ state: 'detached' });
      await page.keyboard.press('1');
      await page.waitForFunction(before => document.querySelector('.act__count')?.innerText !== before, countBefore);
      await page.screenshot({ path: path.join(OUT, `${width}x${height}-chore-after.png`) });
      assert.deepEqual(errors, [], 'no page errors during chore/modal round trip');
      console.log(`PASS modal keyboard isolation, packet/chore round trips ${width}x${height}`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
