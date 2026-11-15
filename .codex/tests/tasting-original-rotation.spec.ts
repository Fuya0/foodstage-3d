import { test, expect, type Page } from '@playwright/test';
import { Euler, Quaternion } from 'three';

async function renderedPose(page: Page) {
  return page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map(entry => entry.name).find(url => url.includes('@react-three_fiber.js'))!;
    const fiber = await import(url);
    const canvas = document.querySelector<HTMLCanvasElement>('canvas[data-engine]')!;
    const root = fiber._roots.get(canvas).store.getState();
    const outer = root.scene.children.find((child: { type: string }) => child.type === 'Group');
    const model = outer.children.find((child: { type: string }) => child.type === 'Group');
    return { quaternion: model.quaternion.toArray(), pitch: Number(canvas.dataset.rotationX), yaw: Number(canvas.dataset.rotationY) };
  });
}
const difference = (quaternion: number[], pitch: number, yaw: number) => new Quaternion().fromArray(quaternion).angleTo(new Quaternion().setFromEuler(new Euler(pitch, yaw, 0, 'XYZ')));

for (const width of [390, 1440]) {
  test(`tasting matches original XYZ throughout a closed drag at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/?table=A01&item=classic-burger&view=tasting');
    const food = page.getByRole('button', { name: '经典汉堡', exact: true });
    await expect(food).toHaveAttribute('data-hit-ready', 'true');
    const box = (await food.boundingBox())!; const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await page.mouse.move(x, y); await page.mouse.down();
    const errors: number[] = [];
    for (const [dx, dy] of [[140, 0], [140, 140], [0, 140], [0, 0]]) {
      await page.mouse.move(x + dx!, y + dy!, { steps: 14 });
      await page.waitForTimeout(90);
      const actual = await renderedPose(page);
      errors.push(difference(actual.quaternion, dy! * .00675, dx! * .00675));
    }
    const closed = await renderedPose(page);
    expect(closed.pitch).toBeCloseTo(0, 5);
    expect(closed.yaw).toBeCloseTo(0, 5);
    expect(difference(closed.quaternion, 0, 0)).toBeLessThan(0.0001);
    expect(Math.max(...errors)).toBeLessThan(0.0001);
    await page.mouse.up();
    await expect(page.getByTestId('experience')).toHaveAttribute('data-bites', '0');
  });
}

test('tasting release inertia uses original XYZ and keeps lower sensitivity', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?table=A01&item=classic-burger&view=tasting');
  const food = page.getByRole('button', { name: '经典汉堡', exact: true });
  await expect(food).toHaveAttribute('data-hit-ready', 'true');
  const box = (await food.boundingBox())!; const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x + 100, y + 60, { steps: 10 });
  await page.mouse.up();
  for (let sample = 0; sample < 4; sample++) {
    await page.waitForTimeout(60);
    const actual = await renderedPose(page);
    expect(difference(actual.quaternion, actual.pitch, actual.yaw)).toBeLessThan(0.0001);
  }
  await expect(page.getByTestId('experience')).toHaveAttribute('data-bites', '0');
});
