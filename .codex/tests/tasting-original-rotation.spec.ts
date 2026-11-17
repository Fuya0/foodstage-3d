// The user approved unrestricted world-up/screen-right rotation on 2026-11-17.
import { test, expect, type Page } from '@playwright/test';
import { Quaternion, Vector3 } from 'three';

async function renderedPose(page: Page, tasting = true) {
  return page.evaluate(async tasting => {
    const url = performance.getEntriesByType('resource').map(entry => entry.name).find(url => url.includes('@react-three_fiber.js'))!;
    const fiber = await import(url);
    const canvas = document.querySelector<HTMLCanvasElement>('canvas[data-engine]')!;
    const root = fiber._roots.get(canvas).store.getState();
    const outer = root.scene.children.find((child: { type: string }) => child.type === 'Group');
    const model = tasting ? outer.children.find((child: { type: string }) => child.type === 'Group') : outer;
    return { quaternion: model.quaternion.toArray(), camera: root.camera.quaternion.toArray() };
  }, tasting);
}
const angle = (a: {quaternion: number[]}, b: {quaternion: number[]}) => new Quaternion().fromArray(a.quaternion).angleTo(new Quaternion().fromArray(b.quaternion));

for (const width of [390, 1440]) {
  test(`free tasting retraces a mixed drag without residual tilt at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/?table=A01&item=classic-burger&view=tasting');
    const food = page.getByRole('button', { name: '经典汉堡', exact: true });
    await expect(food).toHaveAttribute('data-hit-ready', 'true');
    const box = (await food.boundingBox())!; const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await page.mouse.move(x, y); await page.mouse.down();
    const before = await renderedPose(page);
    const path = [[x + 80, y], [x + 80, y + 50], [x + 40, y + 100]];
    for (const [px, py] of path) await page.mouse.move(px!, py!, { steps: 10 });
    await page.waitForTimeout(80);
    expect(angle(before, await renderedPose(page))).toBeGreaterThan(.4);
    for (const [px, py] of [[x + 80, y + 50], [x + 80, y], [x, y]]) await page.mouse.move(px!, py!, { steps: 10 });
    await page.waitForTimeout(80);
    expect(angle(before, await renderedPose(page))).toBeLessThan(0.0001);
    await page.mouse.up();
    await expect(page.getByTestId('experience')).toHaveAttribute('data-bites', '0');
  });
}

test('welcome horizontal half turn stays level and has no CSS perspective tilt', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const preview = page.getByTestId('menu-model-preview');
  await expect(preview).toHaveAttribute('data-ready', 'true');
  const box = (await preview.boundingBox())!; const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x + Math.PI / .0135, y, { steps: 30 });
  await page.waitForTimeout(100);
  const pose = await renderedPose(page, false);
  const up = new Vector3(0, 1, 0).applyQuaternion(new Quaternion().fromArray(pose.quaternion));
  expect(up.distanceTo(new Vector3(0, 1, 0))).toBeLessThan(1e-6);
  expect(new Quaternion().fromArray(pose.quaternion).angleTo(new Quaternion())).toBeGreaterThan(3);
  expect(await page.locator('.food-holo-object').evaluate(el => new DOMMatrixReadOnly(getComputedStyle(el).transform).is2D)).toBe(true);
  await page.mouse.up();
});

test('all four stages keep the rendered pose and replay resets it', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?table=A01&item=classic-burger&view=tasting');
  const food = page.getByRole('button', { name: '经典汉堡', exact: true });
  const experience = page.getByTestId('experience');
  await expect(food).toHaveAttribute('data-hit-ready', 'true');
  const canvas = await page.locator('canvas[data-engine]').elementHandle();
  const box = (await food.boundingBox())!;
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x + 70, y + 40, { steps: 10 });
  await page.waitForTimeout(110); await page.mouse.up();
  const held = await renderedPose(page);
  expect(new Quaternion().fromArray(held.quaternion).angleTo(new Quaternion())).toBeGreaterThan(.4);
  for (let stage = 0; stage < 4; stage++) {
    await expect(experience).toHaveAttribute('data-stage', String(stage));
    await expect(experience).toHaveAttribute('data-phase', 'idle');
    expect(await canvas!.evaluate(el => el.isConnected)).toBe(true);
    expect(angle(held, await renderedPose(page))).toBeLessThan(.0001);
    for (let bite = 0; bite < 3; bite++) {
      await food.press('Enter');
      if (bite < 2) await expect(experience).toHaveAttribute('data-bites', String(bite + 1));
    }
  }
  await expect(experience).toHaveAttribute('data-phase', 'finished');
  await page.getByRole('button', {name:'再吃一次'}).click();
  await expect(experience).toHaveAttribute('data-phase', 'idle');
  await expect(food).toHaveAttribute('data-hit-ready', 'true');
  await expect.poll(async () => {
    try { return new Quaternion().fromArray((await renderedPose(page)).quaternion).angleTo(new Quaternion()); }
    catch { return Math.PI; }
  }).toBeLessThan(.0001);
});
