import { test, expect, type Page } from '@playwright/test';
import { Quaternion, Vector3 } from 'three';
async function tastingPose(page: Page) {
  return page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map(entry => entry.name).find(url => url.includes('/.vite/deps/@react-three_fiber.js'))!;
    const fiber = await import(url);
    const canvas = document.querySelector('canvas[data-engine]');
    const root = fiber._roots.get(canvas).store.getState();
    const outer = root.scene.children.find((child: { type: string }) => child.type === 'Group');
    const model = outer.children.find((child: { type: string }) => child.type === 'Group');
    return { orientation: model.quaternion.toArray(), position: outer.position.toArray(), camera: root.camera.quaternion.toArray() };
  });
}
const rotation = (values: number[]) => new Quaternion().fromArray(values);

test('tasting retains original upright presentation without idle or hover pose changes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/?table=A01&item=classic-burger&view=tasting');
  const food = page.getByRole('button', { name: '经典汉堡', exact: true });
  await expect(food).toHaveAttribute('data-hit-ready', 'true');
  await page.mouse.move(0, 0);
  await page.waitForTimeout(2400);
  const initial = await tastingPose(page);
  await page.waitForTimeout(1100);
  const idle = await tastingPose(page);
  expect(rotation(initial.orientation).angleTo(rotation(idle.orientation))).toBeLessThan(0.001);
  expect(Math.abs(idle.position[1]! - initial.position[1]!)).toBeLessThan(0.00001);
  const box = (await food.boundingBox())!;
  await page.mouse.move(box.x + box.width * .8, box.y + box.height * .2);
  await page.waitForTimeout(250);
  const hovered = await tastingPose(page);
  expect(rotation(initial.orientation).angleTo(rotation(hovered.orientation))).toBeLessThan(0.001);
  await page.screenshot({ path: '.codex/acceptance-20261114/tasting-upright.png' });
});

test('horizontal tasting drag retains original vertical model axis', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?table=A01&item=classic-burger&view=tasting');
  const food = page.getByRole('button', { name: '经典汉堡', exact: true });
  await expect(food).toHaveAttribute('data-hit-ready', 'true');
  const box = (await food.boundingBox())!; const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x + 100, y, { steps: 12 }); await page.waitForTimeout(120);
  const pose = await tastingPose(page);
  const up = new Vector3(0, 1, 0).applyQuaternion(rotation(pose.orientation));
  expect(Math.abs(up.x)).toBeLessThan(0.00001);
  expect(Math.abs(up.z)).toBeLessThan(0.00001);
  expect(up.y).toBeCloseTo(1, 5);
  await page.mouse.up();
});

for (const reduced of [false, true]) {
  test(`cart addition feedback is finite and only runs after adding; reduced=${reduced}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
    await page.addInitScript(() => {
      (window as any).cartPulses = [];
      document.addEventListener('animationstart', event => {
        if ((event.target as Element).matches('.ordering-bag b')) (window as any).cartPulses.push(event.animationName);
      });
    });
    await page.goto('/?mode=takeaway');
    const open = page.getByRole('button', { name: '查看经典汉堡', exact: true });
    await open.click();
    const add = page.getByRole('button', { name: '加入点单', exact: true });
    await add.scrollIntoViewIfNeeded();
    await add.hover();
    await page.mouse.down();
    await page.waitForTimeout(120);
    await expect.poll(() => add.evaluate(button => new DOMMatrix(getComputedStyle(button).transform).a)).toBeCloseTo(reduced ? 1 : .98, 2);
    await page.mouse.up();
    await expect(page.getByRole('button', { name: '查看购物车，1 件菜品' })).toBeVisible();
    await expect(page.locator('.ordering-bag b')).toHaveText('1');
    await page.waitForTimeout(220);
    expect(await page.evaluate(() => (window as any).cartPulses.length)).toBe(reduced ? 0 : 1);
    await page.getByRole('button', { name: '设置', exact: true }).click();
    await page.getByLabel('动态效果').selectOption('reduced');
    await page.waitForTimeout(80);
    await page.getByLabel('动态效果').selectOption('full');
    await page.waitForTimeout(220);
    await page.getByLabel('动态效果').selectOption('system');
    await page.getByRole('button', { name: '关闭设置', exact: true }).click();
    expect(await page.evaluate(() => (window as any).cartPulses.length)).toBe(reduced ? 0 : 1);

    expect(await page.locator('.ordering-bag b').evaluate(badge => badge.getAnimations().filter(animation => animation.playState === 'running').length)).toBe(0);
    await open.click(); await page.getByRole('button', { name: '返回菜单', exact: true }).click();
    await page.waitForTimeout(220);
    expect(await page.evaluate(() => (window as any).cartPulses.length)).toBe(reduced ? 0 : 1);
    await open.click(); await page.getByRole('button', { name: '加入点单', exact: true }).click();
    await expect(page.locator('.ordering-bag b')).toHaveText('2');
    await page.waitForTimeout(220);
    expect(await page.evaluate(() => (window as any).cartPulses.length)).toBe(reduced ? 0 : 2);
  });
}
