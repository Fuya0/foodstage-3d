import { test, expect, type Page } from '@playwright/test';
import { Quaternion, Vector3 } from 'three';

const observedFiberModules = new WeakMap<Page, string>();

type Pose = { quaternion: number[]; camera: number[]; frames: number };
async function pose(page: Page, tasting = false): Promise<Pose> {
  return page.evaluate(async ({ tasting, moduleUrl }) => {
    const url = moduleUrl ?? performance.getEntriesByType('resource').map(entry => entry.name).find(url => url.includes('/.vite/deps/@react-three_fiber.js'));
    if (!url) throw new Error('R3F module not observed');
    const fiber = await import(url);
    const canvas = document.querySelector('canvas[data-engine]');
    const state = fiber._roots.get(canvas)?.store.getState();
    const outer = state?.scene.children.find((child: { type: string }) => child.type === 'Group');
    const group = tasting ? outer?.children.find((child: { type: string }) => child.type === 'Group') : outer;
    if (!group) throw new Error('Rendered model group not found');
    return { quaternion: group.quaternion.toArray(), camera: state.camera.quaternion.toArray(), frames: state.gl.info.render.frame };
  }, { tasting, moduleUrl: observedFiberModules.get(page) });
}
function direction(before: Pose, after: Pose) {
  const delta = new Quaternion().fromArray(after.quaternion).multiply(new Quaternion().fromArray(before.quaternion).invert());
  const camera = new Quaternion().fromArray(before.camera);
  const point = new Vector3(0, 0, 1).applyQuaternion(camera).applyQuaternion(delta).applyQuaternion(camera.invert());
  return { right: point.x, down: -point.y };
}
const angle = (a: Pose, b: Pose) => new Quaternion().fromArray(a.quaternion).angleTo(new Quaternion().fromArray(b.quaternion));

for (const flipped of [false, true]) {
  test(`tasting downward drag follows screen direction after horizontal flip=${flipped}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/?table=A01&item=classic-burger&view=tasting');
    const food = page.getByRole('button', { name: '经典汉堡', exact: true });
    await expect(food).toHaveAttribute('data-hit-ready', 'true');
    const box = (await food.boundingBox())!; const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await page.mouse.move(x, y); await page.mouse.down();
    const endX = x + (flipped ? 350 : 0);
    await page.mouse.move(endX, y, { steps: 20 }); await page.waitForTimeout(120);
    const before = await pose(page, true);
    await page.mouse.move(endX, y + 24, { steps: 4 }); await page.waitForTimeout(120);
    const after = await pose(page, true);
    expect(direction(before, after).down).toBeGreaterThan(0.1);
    // This checks the actual rendered rotation, including the lower interaction gain.
    expect(angle(before, after)).toBeGreaterThan(0.14);
    expect(angle(before, after)).toBeLessThan(0.19);
    await page.mouse.up();
    await expect(page.getByTestId('experience')).toHaveAttribute('data-bites', '0');
  });
}

for (const width of [390, 1440]) {
  test(`detail returns gently, can be interrupted and stops rendering when settled at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/?table=A01&item=classic-burger&view=detail');
    const preview = page.getByTestId('menu-model-preview');
    await expect(preview).toHaveAttribute('data-ready', 'true');
    await preview.scrollIntoViewIfNeeded();
    const home = await pose(page);
    const box = (await preview.boundingBox())!; const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await page.mouse.move(x, y); await page.mouse.down();
    await page.mouse.move(x + 80, y + 50, { steps: 8 }); await page.mouse.up();
    await page.waitForTimeout(50);
    const held = await pose(page);
    expect(angle(home, held)).toBeGreaterThan(0.8);
    await page.waitForTimeout(250);
    const returning = await pose(page);
    expect(angle(home, returning)).toBeLessThan(angle(home, held) - 0.1);
    expect(angle(home, returning)).toBeGreaterThan(0.1);
    // Grabbing a returning model freezes it at its current orientation.
    await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(80);
    const grabbed = await pose(page); await page.waitForTimeout(250);
    expect(angle(grabbed, await pose(page))).toBeLessThan(0.01);
    await page.mouse.move(x + 30, y + 20, { steps: 4 }); await page.mouse.up();
    await expect.poll(async () => angle(home, await pose(page)), { timeout: 1500 }).toBeLessThan(0.01);
    await page.waitForTimeout(150);
    const settled = await pose(page); await page.waitForTimeout(300);
    expect((await pose(page)).frames).toBe(settled.frames);
  });
}


test('mobile tasting touch follows the screen and cancel stops release inertia', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?table=A01&item=classic-burger&view=tasting');
  const food = page.getByRole('button', { name: '经典汉堡', exact: true });
  await expect(food).toHaveAttribute('data-hit-ready', 'true');
  const box = (await food.boundingBox())!; const x = box.x + box.width / 2, y = box.y + box.height / 2;
  const session = await page.context().newCDPSession(page);
  const scroll = await page.evaluate(() => window.scrollY);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  const before = await pose(page, true);
  for (let i = 1; i <= 6; i++) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + i * 10, y: y + i * 5 }] });
  await page.waitForTimeout(120);
  const after = await pose(page, true);
  expect(direction(before, after).right).toBeGreaterThan(0.3);
  expect(direction(before, after).down).toBeGreaterThan(0.15);
  expect(angle(before, after)).toBeGreaterThan(0.4);
  expect(angle(before, after)).toBeLessThan(0.5);
  await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await page.waitForTimeout(250);
  expect(angle(after, await pose(page, true))).toBeLessThan(0.01);
  expect(await page.evaluate(() => window.scrollY)).toBe(scroll);
  await expect(page.getByTestId('experience')).toHaveAttribute('data-bites', '0');
  await session.detach();
});
for (const { id, delay } of [{ id: 'crispy-chicken', delay: 70 }, { id: 'mango-cheesecake', delay: 300 }]) {
  test(`detail preserves ${id} home and suspends return while offscreen`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 400 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    // Clock replaces performance APIs; retain the actual module URL from the browser request.
    page.on('request', request => { if (request.url().includes('@react-three_fiber.js')) observedFiberModules.set(page, request.url()); });
    await page.clock.install({ time: new Date('2026-11-15T00:00:00Z') });
    await page.goto(`/?table=A01&item=${id}&view=detail`);
    const preview = page.getByTestId('menu-model-preview');
    await expect(preview).toHaveAttribute('data-ready', 'true');
    await preview.scrollIntoViewIfNeeded();
    const home = await pose(page);
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 50));
    const box = (await preview.boundingBox())!; const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await page.mouse.move(x, y); await page.mouse.down();
    await page.mouse.move(x + 60, y + 40, { steps: 8 }); await page.mouse.up();
    await page.clock.runFor(delay);
    expect(angle(home, await pose(page))).toBeGreaterThan(0.3);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.clock.runFor(32);
    await expect(preview).toHaveAttribute('data-ready', 'false');
    await expect(preview.locator('canvas')).toHaveCount(0);
    const hiddenPitch = await preview.getAttribute('data-pitch');
    await page.clock.runFor(2700);
    expect(await preview.getAttribute('data-pitch')).toBe(hiddenPitch);
    await preview.scrollIntoViewIfNeeded();
    // Resume frames as Canvas measures/remounts, without letting real GPU time advance the return.
    await expect.poll(async () => {
      await page.clock.runFor(16);
      return preview.getAttribute('data-ready');
    }).toBe('true');
    await page.clock.runFor(32);
    // Resume from the preserved pose; do not assume how far a faster return progressed before scrolling.
    expect(Number(await preview.getAttribute('data-pitch'))).toBeCloseTo(Number(hiddenPitch), 3);
    await page.clock.runFor(900);
    expect(angle(home, await pose(page))).toBeLessThan(0.01);
  });
}
