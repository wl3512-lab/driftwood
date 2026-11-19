// Message-audit regressions through the actual UI. Dialogue and hand actions
// are deterministic; evidence is read through the book, not injected into state.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { connectSource } = require('./v2-evidence-helper.cjs');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8872/v2/';
const OUT = process.env.EVIDENCE_DIR || '/tmp/driftwood-message-targeted';
const MUTE = fs.readFileSync(path.join(__dirname, 'test-mute.js'), 'utf8');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const { LEVELS, MAP } = await import(pathToFileURL(path.join(__dirname, '../v2/levels/index.js')));
  const { everyVersion } = await import(pathToFileURL(path.join(__dirname, '../v2/engine/variants.js')));
  const { SCENARIOS } = await import(pathToFileURL(path.join(__dirname, '../v2/engine/transfer.js')));
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const results = [];
  async function context(size, version = 0) {
    const ctx = await browser.newContext({ viewport: size, hasTouch: size.width < 900, reducedMotion: 'reduce' });
    await ctx.addInitScript(MUTE);
    await ctx.addInitScript(v => {
      window.__dwVersion = v;
      localStorage.setItem('dw2_extra_chores', '0');
    }, version);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    return { ctx, page, errors };
  }
  async function runTo(page, id, { cite = false, fooled = [], version = 0, stopAt } = {}) {
    const level = everyVersion(LEVELS[id])[version];
    await page.goto(`${BASE}?screen=level&level=${id}&ai=0`);
    await page.waitForSelector('main.level[data-phase]');
    for (let n = 0; n < 70; n++) {
      await page.waitForFunction(() => !document.querySelector('main.level .act, main.level .chore-wait'));
      const phase = await page.locator('main.level').getAttribute('data-phase');
      const stepId = await page.locator('main.level').getAttribute('data-step');
      const step = level.steps.find(s => s.id === stepId);
      if (stopAt && stopAt(phase, step)) return;
      if (phase === 'ask') await page.locator('[data-fid="chip-0"]').click();
      else if (phase === 'advice') {
        if (level.number > 1) assert.equal(await page.locator('.bubble--glitch').count(), 0, 'no wrong-answer giveaway');
        if (step.kind === 'trust') await page.locator(step.place ? '.btn--place' : '[data-fid="do"]').first().click();
        else await page.locator(`[data-fid="${fooled.includes(step.id) ? 'do' : 'off'}"]`).click();
      } else if (phase === 'pushback') await page.locator('[data-fid="off"]').click();
      else if (phase === 'name') await page.locator(`[data-fid="pick-${step.correctFlaw}"]`).click();
      else if (phase === 'fix') await page.locator(`[data-fid="pick-${step.correctFix}"]`).click();
      else if (phase === 'reanswer') {
        if (cite) await connectSource(page);
        await page.locator('[data-fid="do"]').click();
      } else if (phase === 'reveal') {
        await page.getByRole('button', { name: 'See what happened →' }).click();
        await page.waitForSelector('.reveal');
        return;
      } else throw new Error(`Unexpected phase ${phase}`);
    }
    throw new Error('Run did not finish');
  }
  async function check(label, fn) {
    try { await fn(); results.push({ test: label, status: 'pass' }); console.log(`pass ${label}`); }
    catch (e) { results.push({ test: label, status: 'fail', error: String(e.stack || e) }); console.error(`FAIL ${label}: ${e.stack || e}`); }
  }
  try {
    for (const size of [{ width: 1280, height: 800 }, { width: 844, height: 390 }, { width: 568, height: 320 }]) {
      await check(`${size.width}/evidence-and-readable-card`, async () => {
        const { ctx, page, errors } = await context(size);
        try {
          await runTo(page, 'level-1', { stopAt: (p, s) => p === 'reanswer' && s.id === 'more-lettuce' });
          await page.locator('[data-tool="almanac"]').click();
          assert.equal(await page.locator('.shelf__future').getAttribute('open'), null);
          assert.equal(await page.locator('.pk:visible').count(), 3, 'only reached packets fill the first shelf');
          await page.locator('.shelf__future summary').click();
          assert.equal(await page.locator('.pk:visible').count(), 15, 'future packets remain available on demand');
          await page.getByRole('button', { name: 'Close almanac' }).click();
          await page.waitForSelector('.almanac[hidden]', { state: 'attached' });
          await page.locator('[data-cite="lettuce"]').click();
          assert.match(await page.locator('.hint').textContent(), /Read that source first/);
          await connectSource(page);
          assert.equal(await page.locator('[data-cite="lettuce"]').getAttribute('aria-pressed'), 'true');
          assert.match(await page.locator('.verify__quote').textContent(), /bitter/);
          assert.equal(await page.locator('.stall--glitch').count(), 0);
          await page.screenshot({ path: path.join(OUT, `${size.width}-evidence.png`) });
          await page.locator('[data-fid="do"]').click();
          // The remaining drift is caught, with no source connected: max two stars.
          await page.waitForSelector('[data-fid="chip-0"]');
          await page.locator('[data-fid="chip-0"]').click();
          await page.locator('[data-fid="off"]').click();
          await page.locator('[data-fid="pick-agreed"]').click();
          await page.locator('[data-fid="pick-honest"]').click();
          await page.locator('[data-fid="do"]').click();
          await page.getByRole('button', { name: 'See what happened →' }).click();
          assert.equal(await page.locator('.reveal__stars').getAttribute('aria-label'), '2 of 3 stars');
          await page.getByRole('button', { name: 'Read why →' }).click();
          assert.match(await page.locator('.rc__why').textContent(), /mirror your preference/);
          assert.equal(await page.locator('.rc__reading').evaluate(e => document.activeElement === e), true);
          await page.locator('.rc__reading').evaluate(e => { e.scrollTop = e.scrollHeight; });
          const geometry = await page.locator('.rc__reading').evaluate(e => {
            const r = e.getBoundingClientRect(); return { right: r.right, bottom: r.bottom, scrollable: e.scrollHeight >= e.clientHeight };
          });
          assert.ok(geometry.right <= size.width && geometry.bottom <= size.height && geometry.scrollable);
          await page.screenshot({ path: path.join(OUT, `${size.width}-explanation.png`) });
          await page.getByRole('button', { name: 'Add to field guide →' }).click();
          await page.waitForSelector('.map');
          assert.equal(await page.locator('.map__extras').getAttribute('aria-pressed'), 'false');
          await page.locator('.map__extras').click();
          assert.equal(await page.locator('.map__extras').getAttribute('aria-pressed'), 'true');
          assert.deepEqual(errors, []);
        } finally { await ctx.close(); }
      });
    }
    await check('mixed-outcome-and-variant-history', async () => {
      const { ctx, page, errors } = await context({ width: 1280, height: 800 });
      try {
        await runTo(page, 'level-4', { cite: true, fooled: ['carrot-date'] });
        await page.getByRole('button', { name: 'Read why →' }).click();
        const history = await page.locator('.rc__history').textContent();
        assert.match(history, /mud|rotted/); assert.match(history, /left.*alone/);
        assert.doesNotMatch(history, /You dug up|You dug over|\{placed/);
        await page.screenshot({ path: path.join(OUT, 'mixed-history.png') });
        assert.deepEqual(errors, []);
      } finally { await ctx.close(); }
      const variant = await context({ width: 1280, height: 800 }, 1);
      try {
        await runTo(variant.page, 'level-2', { version: 1, fooled: ['soak-basil', 'mint'] });
        await variant.page.getByRole('button', { name: 'Read why →' }).click();
        assert.match(await variant.page.locator('.rc__history').textContent(), /mint didn't die in the bed/i);
        assert.deepEqual(variant.errors, []);
      } finally { await variant.ctx.close(); }
    });
    await check('inspection-pauses-pressure', async () => {
      const { ctx, page, errors } = await context({ width: 844, height: 390 });
      try {
        await runTo(page, 'level-5', { cite: true, stopAt: (p, s) => p === 'advice' && s.id === 'meadow' });
        const before = await page.locator('.meter__text').textContent();
        await page.locator('[data-tool="almanac"]').click();
        assert.equal(await page.locator('main.level').getAttribute('data-pressure-paused'), 'true');
        await page.waitForTimeout(8500);
        assert.equal(await page.locator('.meter__text').textContent(), before);
        await page.getByRole('button', { name: 'Close almanac' }).click();
        await page.waitForFunction(() => document.querySelector('main.level').dataset.pressurePaused === 'false');
        await page.waitForTimeout(500);
        assert.equal(await page.locator('.meter__text').textContent(), before, 'reading grace resumes after inspection');
        assert.deepEqual(errors, []);
      } finally { await ctx.close(); }
    });
    await check('transfer-checks-outside-the-chat', async () => {
      const { ctx, page, errors } = await context({ width: 390, height: 844 });
      try {
        await page.goto(BASE);
        await page.evaluate(ids => {
          const levels = Object.fromEntries(ids.map(id => [id, { stars: 3, fooled: false, caught: true, practice: 1 }]));
          localStorage.setItem('dw2_progress', JSON.stringify({ name: 'Tester', levels, guide: [] }));
        }, MAP.map(m => m.id));
        await page.goto(`${BASE}?screen=ending`);
        const id = await page.locator('.transfer').getAttribute('data-scenario');
        const correct = SCENARIOS.find(s => s.id === id).correct;
        await page.locator(`[data-transfer-choice="${correct}"]`).click();
        assert.equal(await page.locator('.transfer__feedback').getAttribute('data-verified'), 'false');
        await page.getByRole('button', { name: 'Course notice', exact: true }).click();
        await page.locator(`[data-transfer-choice="${correct}"]`).click();
        assert.equal(await page.locator('.transfer__feedback').getAttribute('data-verified'), 'true');
        assert.equal(await page.locator('.ending__why').count(), 5);
        await page.locator('.transfer').scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(OUT, 'transfer-portrait.png') });
        assert.deepEqual(errors, []);
      } finally { await ctx.close(); }
    });
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
  }
  process.exitCode = results.some(r => r.status !== 'pass') ? 1 : 0;
})();
