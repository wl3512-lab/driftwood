const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const OUT = process.env.EVIDENCE_DIR || 'docs/agent-playtest/2026-11-15-navigation';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8766/v2/';
const mute = fs.readFileSync(path.join(__dirname, 'test-mute.js'), 'utf8');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true });
  const results = [];
  try {
    for (const size of [{ name: 'desktop', width: 1512, height: 830 }, { name: 'portrait', width: 390, height: 844, touch: true }, { name: 'small', width: 568, height: 320, touch: true }]) {
      const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, hasTouch: !!size.touch, reducedMotion: 'reduce' });
      await context.addInitScript(mute);
      await context.addInitScript(() => { window.__dwHandoff = true; window.__dwAutoAct = false; });
      const page = await context.newPage();
      const errors = [];
      const failedRequests = [];
      page.on('requestfailed', r => failedRequests.push({ url: r.url(), error: r.failure()?.errorText }));
      page.on('pageerror', e => errors.push(String(e)));
      page.on('console', m => { if (['warning', 'error'].includes(m.type())) errors.push(m.text()); });
      const manifest = [];
      const shot = async name => {
        await page.waitForTimeout(550);
        await page.screenshot({ path: path.join(OUT, `${size.name}-${name}.png`) });
        manifest.push({ at: new Date().toISOString(), state: name, focused: await page.locator(':focus').evaluateAll(es => es.map(e => e.textContent || e.id)), console: [...errors] });
      };
      await page.goto(BASE + '?ai=0');
      await page.getByRole('button', { name: 'Begin ▸' }).click().catch(async e => {
        await page.screenshot({ path: path.join(OUT, `${size.name}-load-failure.png`) });
        console.error({ errors, failedRequests, body: await page.locator('body').innerText() });
        throw e;
      });
      await page.locator('#player-name').fill('  Garden Tester  ');
      await page.getByRole('button', { name: 'Enter the garden ▸' }).click();
      await shot('named');
      await page.getByRole('button', { name: 'Skip ▸▸' }).click();
      await page.getByRole('button', { name: 'Start Level 1 ▸' }).click();
      await page.locator('.ho').waitFor();
      await shot('seed-handoff');
      assert.equal(await page.locator('main.level').evaluate(e => e.inert), true);
      await page.keyboard.press('/');
      assert.equal(await page.locator('main.level.is-reading').count(), 0, 'handoff blocks background tool shortcut');
      await page.getByRole('button', { name: 'Next ▸', exact: true }).click();
      await page.locator('.ho').waitFor({ state: 'detached' });
      await shot('level-first-job');
      await page.getByRole('button', { name: /Map/ }).click();
      await page.locator('.plots').waitFor();
      assert.equal(await page.locator('[data-level="level-2"]').isDisabled(), true);
      await shot('map');
      await page.getByRole('button', { name: 'Field guide 0/5' }).click();
      await shot('empty-guide');
      await page.getByRole('button', { name: '← Back to the garden' }).click();
      await page.getByRole('button', { name: '▸ Watch intro' }).click();
      assert.equal(await page.locator('#player-name').isVisible(), false, 'rewatch keeps saved name');
      await page.getByRole('button', { name: 'Skip ▸▸' }).click();
      await page.getByRole('button', { name: 'Back to the garden ▸' }).click();
      await shot('rewatch-return');
      await page.reload();
      await page.getByRole('button', { name: 'Continue ▸' }).waitFor();
      await page.getByRole('button', { name: 'New game', exact: true }).click();
      await shot('new-game-confirm');
      await page.getByRole('button', { name: 'Keep my garden' }).click();
      assert.equal(await page.locator('.splash__save').textContent(), "Garden Tester's garden · 0 of 5 levels");
      await page.getByRole('button', { name: 'Continue ▸' }).click();
      await page.locator('.plots').waitFor();
      const save = await page.evaluate(() => JSON.parse(localStorage.getItem('dw2_progress')));
      assert.equal(save.name, 'Garden Tester');
      assert.deepEqual(save.handoffSeen, ['level-1']);
      assert.deepEqual(errors, [], JSON.stringify(failedRequests));
      results.push({ size: size.name, status: 'pass', manifest });
      await context.close();
    }
  } finally {
    fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
    await browser.close();
  }
  console.log(JSON.stringify(results.map(({ size, status }) => ({ size, status }))));
})().catch(error => { console.error(error); process.exitCode = 1; });
