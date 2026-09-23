// Run against a local server with Playwright available through NODE_PATH.
// Optional: BASE_URL, CHROME_PATH, EVIDENCE_DIR.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const evidenceDir = process.env.EVIDENCE_DIR;
const sizes = [[844, 390], [740, 360], [1024, 600], [568, 320], [700, 390], [1200, 800], [1440, 900]];
const selectors = ['#garden-health-display', '#mood-indicator', '.garden-hud-cluster .sound-toggle-btn', '.garden-hud-cluster .tips-guide-btn', '.paw-menu-btn'];

async function measure(page) {
  return page.evaluate(selectors => selectors.map(selector => {
    const el = document.querySelector(selector);
    const rect = el.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return {
      selector,
      text: el.textContent.trim(),
      rect: rect.toJSON(),
      visible: getComputedStyle(el).visibility === 'visible' && rect.width > 0 && rect.height > 0,
      withinViewport: rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight,
      unobstructed: hit === el || el.contains(hit),
    };
  }), selectors);
}

function checkLayout(controls, label) {
  const failures = [];
  for (const control of controls) {
    if (!control.visible || !control.withinViewport || !control.unobstructed) failures.push(`${label}: ${control.selector} is hidden, clipped, or obstructed`);
  }
  for (let i = 0; i < controls.length; i++) {
    for (let j = i + 1; j < controls.length; j++) {
      const a = controls[i].rect;
      const b = controls[j].rect;
      const overlap = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      if (overlap > 0) failures.push(`${label}: ${controls[i].selector} overlaps ${controls[j].selector} by ${overlap.toFixed(2)} px²`);
    }
  }
  return failures;
}

(async () => {
  if (evidenceDir) fs.mkdirSync(evidenceDir, { recursive: true });
  const browser = await chromium.launch({
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
    headless: true,
    args: ['--mute-audio'],
  });
  const results = [];
  const failures = [];
  try {
    const context = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    const page = await context.newPage();
    await page.goto(process.env.BASE_URL || 'http://127.0.0.1:8766/');
    await page.getByRole('button', { name: 'Enter Driftwood', exact: true }).click();
    // Begin only advances once the hero has finished revealing, and the entry
    // section is inert until it is the active one — wait for both, or the
    // name never lands and adoption is never reached.
    await page.locator('#section-hero .section-continue-btn.ready').waitFor({ timeout: 30000 });
    await page.getByRole('button', { name: 'Begin', exact: true }).click();
    await page.locator('#section-enter.active').waitFor({ timeout: 10000 });
    await page.locator('#name-input').fill('Mobile Verify');
    await page.getByRole('radio', { name: 'they ask me', exact: true }).click();
    await page.getByRole('button', { name: 'enter the garden', exact: true }).click();
    await page.locator('#adopt-cat').click();
    await page.locator('#go-garden-btn').click();
    await page.locator('#garden-health-display').waitFor();
    await page.locator('.toast.show').waitFor({ state: 'hidden' });
    await page.evaluate(() => document.fonts.ready);

    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height });
      // Resize handlers and the entrance transition must finish before hit-testing.
      await page.waitForTimeout(600);
      const controls = await measure(page);
      failures.push(...checkLayout(controls, `${width}x${height}`));
      results.push({ viewport: { width, height }, mood: 'neutral', controls });
      if (evidenceDir) await page.screenshot({ path: path.join(evidenceDir, `${width}x${height}-neutral.png`) });
    }

    // The longest mood label must fit, and both covered controls must work.
    await page.setViewportSize({ width: 740, height: 360 });
    await page.locator('#mood-indicator').click();
    await page.getByRole('button', { name: 'surprised', exact: true }).click();
    await page.locator('.toast.show').waitFor({ state: 'hidden' });
    const controls = await measure(page);
    failures.push(...checkLayout(controls, '740x360 surprised'));
    results.push({ viewport: { width: 740, height: 360 }, mood: 'surprised', controls });
    if (evidenceDir) await page.screenshot({ path: path.join(evidenceDir, '740x360-surprised.png') });
    // Do not let the known pre-fix overlap turn this regression into a click timeout.
    if (!failures.length) {
      await page.locator('#garden-health-display').click();
      await page.locator('#garden-health-panel').waitFor();
      assert.match(await page.locator('#garden-health-panel').innerText(), /GARDEN/i);
    }
  } finally {
    if (evidenceDir) fs.writeFileSync(path.join(evidenceDir, 'layout.json'), JSON.stringify({ at: new Date().toISOString(), results, failures }, null, 2));
    await browser.close();
  }
  assert.equal(failures.length, 0, failures.join('\n'));
  console.log(`PASS: ${results.length} settled HUD layouts; mood declaration and health details are operable.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
