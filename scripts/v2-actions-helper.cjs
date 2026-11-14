// Shared Playwright helpers for v2's hands-on actions (v2/actions/runner.js).
//
//   completeAction(page)      finish the open action with the keyboard: focus
//                             the tool, press Enter, wait for the animation,
//                             repeat until the tool card is gone.
//   skipChore(page)           press a chore's "Skip" and wait for it to close.
//   actionIdle(page)          wait until no action is mid-animation.
//   dragTo(page, from, to, { touch })   a real drag: mouse, or CDP touch events
//                             (the tool rides 44 px above a finger, so the
//                             touch point goes that far below the target).
//
// Default test runs auto-finish actions (scripts/test-mute.js sets
// window.__dwAutoAct = true). A run that wants to drag sets it to false:
//   await ctx.addInitScript(() => { window.__dwAutoAct = false; });
// or flips it mid-run with page.evaluate(() => { window.__dwAutoAct = false; }).

async function actionIdle(page, timeout = 6000) {
  await page.waitForFunction(() => {
    const a = document.querySelector("main.level .act");
    return !a || a.dataset.busy !== "true";
  }, null, { timeout });
}

async function completeAction(page, { timeout = 20000 } = {}) {
  const until = Date.now() + timeout;
  await page.waitForSelector("main.level .act", { timeout: 5000 });
  while (await page.locator("main.level .act").count()) {
    if (Date.now() > until) throw new Error("completeAction: the action never finished");
    await actionIdle(page);
    const item = page.locator("main.level .act__item");
    if (!(await item.count())) break;
    await item.focus();
    await page.keyboard.press("Enter");
    // Enter starts the move; wait for it to land (the card goes, or goes idle again).
    await page.waitForTimeout(60);
    await actionIdle(page).catch(() => {});
  }
}

// Skip the chore on screen (its quiet "Skip" button) and wait for it to finish.
async function skipChore(page) {
  const skip = page.locator("main.level .act [data-act-skip]");
  await skip.waitFor({ timeout: 5000 });
  await skip.click();
  await page.waitForSelector("main.level .act", { state: "detached", timeout: 5000 });
}

async function dragTo(page, from, to, { touch = false, steps = 12, release = true } = {}) {
  const a = await page.locator(from).first().boundingBox();
  const b = await page.locator(to).first().boundingBox();
  if (!a || !b) throw new Error(`dragTo: missing ${!a ? from : to}`);
  const p0 = { x: a.x + a.width / 2, y: a.y + a.height / 2 };
  const p1 = { x: b.x + b.width / 2, y: b.y + b.height / 2 + (touch ? 44 : 0) };
  if (!touch) {
    await page.mouse.move(p0.x, p0.y);
    await page.mouse.down();
    await page.mouse.move(p1.x, p1.y, { steps });
    const up = () => page.mouse.up();
    if (release) await up();
    return up;
  }
  const cdp = await page.context().newCDPSession(page);
  const send = (type, p) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: p ? [{ x: Math.round(p.x), y: Math.round(p.y) }] : [] });
  await send("touchStart", p0);
  for (let i = 1; i <= steps; i++) await send("touchMove", { x: p0.x + (p1.x - p0.x) * i / steps, y: p0.y + (p1.y - p0.y) * i / steps });
  const up = () => send("touchEnd");
  if (release) await up();
  return up;
}

module.exports = { completeAction, actionIdle, dragTo, skipChore };
