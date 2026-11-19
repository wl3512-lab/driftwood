// Follow the real evidence UI before an ideal-run fixture acts on a correction.
// Negative cases in test-v2-message.cjs deliberately do not call this helper.
async function connectSource(page) {
  if (await page.locator('.verify [data-cite][aria-pressed="true"]').count()) return;
  const source = await page.evaluate(async () => {
    const { LEVELS } = await import('./levels/index.js');
    const m = document.querySelector('main.level');
    return LEVELS[m.dataset.level].steps.find(s => s.id === m.dataset.step).evidenceId;
  });
  if (source === 'wildberry') {
    const mag = page.locator('[data-tool="magnifier"]');
    await mag.click();
    await page.locator('.plant[data-inspect="wildberry"]').first().click();
    await page.getByRole('button', { name: 'Close magnifier' }).click();
  }
  await page.locator('[data-tool="almanac"]').click();
  await page.waitForSelector('.almanac:not([hidden])');
  if (source !== 'carrot') {
    const shelfTab = page.locator('.almanac__sheet-tab[data-sheet="shelf"]');
    if (await shelfTab.count()) await shelfTab.click();
    await page.locator(`.pk[data-plant="${source}"]:not(.pk--clone)`).click();
    await page.locator('.back__flip').click();
    await page.waitForSelector('.back', { state: 'detached' });
  }
  await page.getByRole('button', { name: 'Close almanac' }).click();
  await page.waitForSelector('.almanac[hidden]', { state: 'attached' });
  await page.locator(`.verify [data-cite="${source}"]`).click();
  await page.waitForSelector(`.verify [data-cite="${source}"][aria-pressed="true"]`);
}
module.exports = { connectSource };
