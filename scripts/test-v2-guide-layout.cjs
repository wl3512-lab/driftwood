// Readability and navigation regression for the map's field guide and ending.
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
    for (const [width, height] of [[1512, 830], [844, 390], [390, 844], [375, 667], [568, 320]]) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
      await context.addInitScript(fs.readFileSync(path.join(__dirname, 'test-mute.js'), 'utf8'));
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', e => { if (['warning', 'error'].includes(e.type())) errors.push(e.text()); });
      await page.goto(BASE);
      await page.evaluate(async () => {
        const { LEVELS } = await import('./levels/index.js');
        const levels = {}, guide = [];
        Object.values(LEVELS).forEach((level, i) => {
          const fooled = i % 2 === 0;
          levels[level.id] = { stars: fooled ? 1 : 3, fooled, trained: fooled ? 0 : 1 };
          guide.push({ levelId: level.id, flaw: level.reveal.flaw, tip: level.reveal.tip, fooled });
        });
        localStorage.setItem('dw2_progress', JSON.stringify({ name: 'User tester', introSeen: true, levels, guide }));
      });
      await page.goto(`${BASE}?screen=map`);
      await page.getByRole('button', { name: /Field guide/ }).click();
      const metrics = await page.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        tips: [...document.querySelectorAll('.gc__tip')].map(el => parseFloat(getComputedStyle(el).fontSize)),
        cards: [...document.querySelectorAll('main.guide .guide__card')].map(el => ({
          bottom: el.getBoundingClientRect().bottom + scrollY,
          left: el.getBoundingClientRect().left,
          right: el.getBoundingClientRect().right,
        })),
        pageHeight: document.documentElement.scrollHeight,
      }));
      assert.equal(metrics.width, width, 'guide must not scroll horizontally');
      assert.equal(metrics.tips.length, 5);
      assert.ok(metrics.tips.every(font => font >= 14), `guide tips must be readable: ${metrics.tips}`);
      assert.ok(metrics.cards.every(card => card.left >= 0 && card.right <= width && card.bottom <= metrics.pageHeight), 'all cards reachable within the page');
      await page.screenshot({ path: path.join(OUT, `${width}x${height}-guide-after.png`), fullPage: true });
      await page.getByRole('button', { name: '← Back to the garden', exact: true }).click();
      await page.getByRole('button', { name: 'Your finished garden →', exact: true }).click();
      await page.screenshot({ path: path.join(OUT, `${width}x${height}-ending.png`) });
      await page.getByRole('button', { name: /field guide/i }).first().click();
      assert.equal(await page.locator('.ending__score').innerText(), 'You caught 2 of 5 · ★ 9/15');
      assert.equal(await page.locator('.ending__card').count(), 5);
      assert.ok(await page.locator('.ending__tip').evaluateAll(els => els.every(el => parseFloat(getComputedStyle(el).fontSize) >= 14)), 'ending tips remain readable');
      await page.screenshot({ path: path.join(OUT, `${width}x${height}-ending-guide.png`) });
      await page.getByRole('button', { name: '← Back to the garden', exact: true }).click();
      await page.locator('main.map').waitFor();
      assert.deepEqual(errors, [], 'no page errors or console warnings throughout guide and ending flows');
      console.log(`PASS readable guide and map/ending round trip ${width}x${height}`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
