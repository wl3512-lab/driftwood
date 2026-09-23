// Regression checks for the September agent-playtest findings.
// Serve the project, then run:
// PLAYWRIGHT_MODULE=/path/to/playwright node scripts/test-playtest-fixes.cjs
// Optional: DRIFTWOOD_URL, CHROME_PATH, TEST_FILTER, TEST_ARTIFACT_DIR.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const url = process.env.DRIFTWOOD_URL || 'http://127.0.0.1:8766/';
const artifacts = process.env.TEST_ARTIFACT_DIR || path.join(os.tmpdir(), 'driftwood-playtest-fixes');
fs.mkdirSync(artifacts, { recursive: true });
const results = [];
let browser;
async function pageForTest() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  await page.goto(url);
  await page.getByRole('button', { name: 'Enter Driftwood', exact: true }).waitFor();
  return { context, page };
}
async function intro(page) {
  await page.keyboard.press('Enter');
  await page.locator('#section-hero.active .section-continue-btn').waitFor();
}
async function entry(page) {
  await intro(page);
  await page.getByRole('button', { name: 'Begin', exact: true }).click();
  await page.locator('#section-enter.active').waitFor();
}
async function check(name, fn) {
  if (process.env.TEST_FILTER && !name.includes(process.env.TEST_FILTER)) return;
  const { context, page } = await pageForTest();
  try { await fn(page); results.push({ name, status: 'pass' }); }
  catch (e) { results.push({ name, status: 'fail', error: e.message }); }
  await page.screenshot({ path: path.join(artifacts, name + '.png') });
  await context.close();
  console.log(results.at(-1));
}
(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--mute-audio'] });
  try {
    await check('diagnosis-options', async page => {
      const actual = await page.evaluate(async () => {
        const ids = ['fox', 'parrot', 'bunny', 'dog', 'cat'];
        const labels = ['Reckless Advisor', 'Agreeableness bias', 'Emotional overdependence', 'Fabricated memory', 'Hallucination'];
        const out = [];
        for (const id of ids) {
          const def = PET_DEFS.find(d => d.id === id);
          const accepted = [];
          for (const label of labels) if ((await evaluateFlawGuess(def, label)).correct) accepted.push(label);
          out.push({ id, accepted });
        }
        return out;
      });
      assert.deepEqual(actual, [
        { id: 'fox', accepted: ['Reckless Advisor'] },
        { id: 'parrot', accepted: ['Agreeableness bias'] },
        { id: 'bunny', accepted: ['Emotional overdependence'] },
        { id: 'dog', accepted: ['Fabricated memory'] },
        { id: 'cat', accepted: ['Hallucination'] }
      ]);
      // The free-text path must still accept descriptions, not only menu labels.
      assert.equal(await page.evaluate(() => evaluateFlawGuessLocally(PET_DEFS.find(d => d.id === 'parrot'), 'agrees with everything').correct), true);
      assert.equal(await page.evaluate(() => evaluateFlawGuessLocally(PET_DEFS.find(d => d.id === 'fox'), 'made up facts').correct), false);
    });
    await check('keyboard-begin', async page => {
      await intro(page);
      await page.getByRole('button', { name: 'Begin', exact: true }).focus();
      await page.keyboard.press('Enter');
      await page.locator('#section-enter.active').waitFor({ timeout: 2500 });
      assert.equal(await page.locator('#name-input').evaluate(e => document.activeElement === e), true, 'entry should focus the visible name input');
    });
    await check('keyboard-camera', async page => {
      await entry(page);
      const off = page.getByRole('radio', { name: 'they ask me', exact: true });
      await off.focus(); await page.keyboard.press('Space');
      assert.equal(await off.getAttribute('aria-checked'), 'true', 'Space should select camera-off');
      await page.keyboard.press('ArrowLeft');
      assert.equal(await page.getByRole('radio', { name: 'they watch my face', exact: true }).getAttribute('aria-checked'), 'true', 'arrow key should move radio selection');
      await page.keyboard.press('ArrowRight');
      assert.equal(await off.getAttribute('aria-checked'), 'true');
    });
    await check('inactive-intro-focus', async page => {
      await intro(page);
      await page.locator('#name-input').focus();
      assert.notEqual(await page.evaluate(() => document.activeElement.id), 'name-input', 'inactive section must reject focus');
      const hiddenFocus = [];
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        if (await page.evaluate(() => !!document.activeElement.closest('#section-enter'))) hiddenFocus.push(i);
      }
      assert.deepEqual(hiddenFocus, [], 'Tab must skip invisible section');
    });
    await check('empty-garden-health', async page => {
      // Isolated state calculation, not a simulated human playthrough.
      const actual = await page.evaluate(() => {
        const before = gardenHealth;
        recalcGardenHealth(); const recalculated = gardenHealth;
        gardenDamage = 8; recalcGardenHealth(); const damaged = gardenHealth;
        return { before, recalculated, damaged };
      });
      assert.deepEqual(actual, { before: 50, recalculated: 50, damaged: 42 });
    });
    await check('keyboard-entry-adoption', async page => {
      await entry(page);
      await page.locator('#name-input').fill('Keyboard Check');
      await page.getByRole('radio', { name: 'they ask me', exact: true }).focus(); await page.keyboard.press('Space');
      await page.getByRole('button', { name: 'enter the garden', exact: true }).focus(); await page.keyboard.press('Enter');
      await page.locator('#adopt-parrot').waitFor();
      await page.locator('#adopt-parrot').focus(); await page.keyboard.press('Space');
      await page.locator('#go-garden-btn:not(.hidden)').waitFor({ timeout: 2500 });
      await page.locator('#go-garden-btn').focus(); await page.keyboard.press('Enter');
      await page.locator('#mood-indicator').waitFor();
      assert.match(await page.locator('#mood-indicator').innerText(), /declare/i);
    });
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(artifacts, 'results.json'), JSON.stringify(results, null, 2));
  }
  if (results.some(r => r.status !== 'pass')) process.exitCode = 1;
})();
