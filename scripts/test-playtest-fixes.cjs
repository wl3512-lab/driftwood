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
    await check('education-ending-gates', async page => {
      const outcomes = await page.evaluate(() => {
        adoptPet('parrot');
        return [[1, 0, true], [2, 1, true], [0, 2, true], [0, 3, true], [0, 4, false]].map(([level, attempts, identified]) => {
          Object.assign(pets.parrot, { trainingLevel: level, trainingAttempts: attempts, flawIdentified: identified });
          endingReady = false;
          checkEndingCondition();
          return endingReady;
        });
      });
      assert.deepEqual(outcomes, [true, true, false, true, false]);
    });
    await check('education-rule-drafts', async page => {
      const results = await page.evaluate(() => {
        const results = [];
        for (const [id, rows] of Object.entries(RULE_CHIPS)) {
          const complete = rows.reduce((drafts, row) => drafts.flatMap(d => row.map(clause => [...d, clause])), [[]]);
          const chips = rows.flat();
          // Any collection of chip taps, including all alternatives and repeats,
          // must stay below mastery. One choice per row must unlock progress.
          const scores = complete.map(d => trainingQualityForPet(id, d.join(' ')));
          let ceiling = 0;
          for (let mask = 1; mask < 2 ** chips.length; mask++) {
            const text = chips.filter((_, i) => mask & (1 << i)).join(' ');
            ceiling = Math.max(ceiling, trainingQualityForPet(id, text + ' ' + text));
          }
          results.push({ id, min: Math.min(...scores), max: Math.max(...scores), ceiling });
        }
        return results;
      });
      assert.equal(results.length, 5);
      for (const r of results) {
        assert.ok(r.min >= 50 && r.max < 90 && r.ceiling < 90, JSON.stringify(r));
      }
    });
    await check('education-chip-keyboard-and-meter', async page => {
      // Dismiss the splash first: its keydown listener would otherwise treat
      // the first Enter below as "start", run onboarding and remove the room.
      await intro(page);
      await page.evaluate(() => {
        adoptPet('parrot');
        Object.assign(pets.parrot, { flawDiscovered: true, flawIdentified: true });
        buildScreen3('parrot');
        openPetDossier(pets.parrot, pets.parrot.def);
      });
      const first = page.locator('.rule-chip').first();
      const clause = await first.innerText();
      await first.focus(); await page.keyboard.press('Enter');
      assert.equal(await page.locator('.phase-rules-textarea').inputValue(), clause);
      assert.equal(await first.getAttribute('aria-pressed'), 'true');
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('.phase-rules-textarea').inputValue(), clause, 'repeat taps must not duplicate the draft');
      assert.ok(await page.locator('#rule-meter-fill').evaluate(el => parseFloat(el.style.width) > 0));
      for (const row of [1, 2]) await page.locator('.rule-chip-row').nth(row).locator('button').first().click();
      assert.match(await page.locator('.rule-meter-status').innerText(), /partial/i);
      await page.locator('.phase-rules-textarea').fill("Don't agree just to please me. Keep this rule no matter my mood. Suggest that I consult an expert.");
      assert.match(await page.locator('.rule-meter-status').innerText(), /all four basics covered.*pushback/i);
      // Own words can still reach mastery; this isn't a hidden score cap.
      await page.locator('.phase-rules-textarea').fill("Never agree just to please me. Push back with honest feedback regardless of my mood. Refer me to an expert when needed.");
      assert.match(await page.locator('.rule-meter-status').innerText(), /strong/i);
    });
    await check('education-partial-ending-flow', async page => {
      await page.evaluate(() => {
        adoptPet('parrot');
        Object.assign(pets.parrot, { flawDiscovered: true, flawIdentified: true });
        buildScreen3('parrot'); openPetDossier(pets.parrot, pets.parrot.def);
      });
      for (let row = 0; row < 3; row++) await page.locator('.rule-chip-row').nth(row).locator('button').first().click();
      await page.getByRole('button', { name: 'TEST RULES', exact: true }).dblclick();
      await page.waitForFunction(() => endingReady && pets.parrot.trainingLevel === 1);
      assert.equal(await page.evaluate(() => pets.parrot.trainingAttempts), 1, 'double click must count as one attempt');
      // Advance only narrative timers, using the actual confession Continue link.
      await page.clock.install();
      await page.evaluate(() => { document.querySelector('.pet-dossier-overlay')?.remove(); buildAct2(); });
      await page.clock.fastForward(21000);
      await page.getByRole('button', { name: /continue/i }).focus(); await page.keyboard.press('Enter');
      await page.locator('#ending-transfer').waitFor();
      await page.getByRole('button', { name: 'View my record' }).click();
      assert.equal(await page.locator('.flaw-tag--trained').count(), 0);
      assert.equal(await page.locator('.flaw-tag--identified').count(), 1);
    });
    await check('education-correction-rates', async page => {
      const summaries = await page.evaluate(() => [0, 49, 50, 74, 75, 89, 90, 99, 100].map(training => trainingChanceSummary({ training })));
      [0, 0, 45, 45, 75, 75, 95, 95, 99].forEach((chance, i) => {
        assert.ok(summaries[i].includes(`(${chance}%)`));
        assert.match(summaries[i], /game setting/);
        assert.match(summaries[i], /If this flaw appears again and the game catches it/);
        assert.doesNotMatch(summaries[i], /your rule held/i);
      });
    });
    await check('education-mercy-and-save', async page => {
      const result = await page.evaluate(async () => {
        adoptPet('parrot'); buildScreen3('parrot');
        const pet = pets.parrot;
        const initial = pet.trainingAttempts;
        pet.flawIdentified = true;
        pet.trainingRules = '   '; await applyTraining();
        const empty = pet.trainingAttempts;
        pet.trainingRules = 'Please be nicer.';
        const gates = [];
        for (let i = 0; i < 3; i++) { await applyTraining(); gates.push(endingReady); }
        saveSession();
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.session));
        const attemptsSaved = saved.pets.parrot.trainingAttempts;
        delete saved.pets.parrot.trainingAttempts;
        localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(saved));
        restoreSession();
        return { initial, empty, gates, attemptsSaved, restored: pets.parrot.trainingAttempts };
      });
      assert.deepEqual(result, { initial: 0, empty: 0, gates: [false, false, true], attemptsSaved: 3, restored: 0 });
    });
    await check('education-transfer-personalization', async page => {
      await page.evaluate(() => {
        ['parrot', 'cat', 'fox'].forEach(adoptPet);
        pets.parrot.flawDiscovered = true; pets.parrot.training = 60;
        pets.cat.flawDiscovered = true; pets.cat.training = 80;
        sessionFlawEvents = [{ petId: 'parrot' }, { petId: 'cat' }, { petId: 'cat' }];
        buildScreenTransfer();
      });
      assert.deepEqual(await page.locator('.transfer-example').evaluateAll(els => els.map(el => el.dataset.petId)), ['parrot', 'cat']);
      assert.equal(await page.locator('.transfer-action').count(), 1);
      assert.equal(await page.locator('.transfer-action').getAttribute('data-pet-id'), 'cat');
      assert.match(await page.locator('.transfer-rule-result').nth(0).innerText(), /45%/);
      assert.match(await page.locator('.transfer-rule-result').nth(1).innerText(), /75%/);
      await page.evaluate(() => { sessionFlawEvents = []; buildScreenTransfer(); });
      assert.equal(await page.locator('.transfer-action').getAttribute('data-pet-id'), 'parrot', 'ties follow adoption order');
      await page.getByRole('button', { name: 'View my record' }).focus(); await page.keyboard.press('Enter');
      await page.locator('#cert-screen').waitFor();
    });
    await check('education-training-and-transfer-layout', async page => {
      for (const [width, height] of [[844, 390], [568, 320], [390, 844], [1440, 900]]) {
        await page.setViewportSize({ width, height });
        await page.evaluate(() => {
          ['fox', 'parrot', 'bunny', 'dog', 'cat'].forEach(adoptPet);
          adoptedPets.forEach(id => { pets[id].flawDiscovered = true; pets[id].flawIdentified = true; });
          buildScreen3('fox'); openPetDossier(pets.fox, pets.fox.def);
          document.querySelectorAll('.toast').forEach(el => el.remove());
        });
        await page.locator('.rule-chip').first().waitFor();
        await page.locator('#pet-dossier-overlay').evaluate(el => Promise.all(
          el.getAnimations({ subtree: true }).filter(a => a.effect.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))
        ));
        await page.screenshot({ path: path.join(artifacts, `education-draft-${width}x${height}.png`) });
        for (const selector of ['.rule-chip', '.phase-rules-textarea', '.phase-big-btn--constrain']) {
          const control = page.locator(selector).first();
          await control.scrollIntoViewIfNeeded();
          const rect = await control.boundingBox();
          assert.ok(rect.x >= 0 && rect.x + rect.width <= width + 1 && rect.y >= 0 && rect.y + rect.height <= height + 1, `${width}x${height}: ${selector} clipped`);
          await control.click({ trial: true });
        }
        await page.screenshot({ path: path.join(artifacts, `education-room-${width}x${height}.png`) });
        await page.evaluate(() => { document.querySelector('.pet-dossier-overlay')?.remove(); buildScreenTransfer(); });
        await page.getByRole('button', { name: 'View my record' }).click({ trial: true });
        assert.ok(await page.evaluate(() => document.querySelector('.transfer-content').scrollWidth <= innerWidth), 'transfer must not overflow horizontally');
        await page.screenshot({ path: path.join(artifacts, `education-transfer-${width}x${height}.png`) });
      }
    });
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
