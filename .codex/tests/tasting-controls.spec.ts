import { test, expect } from '@playwright/test';

for (const width of [390, 1440]) {
  test(`tasting stays direct without a camera toolbar at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/?table=A01&item=classic-burger&view=tasting');
    const food = page.getByRole('button', { name: '经典汉堡', exact: true });
    await expect(food).toHaveAttribute('data-hit-ready', 'true');
    await expect(page.getByRole('group', { name: '模型视角', exact: true })).toHaveCount(0, { timeout: 1500 });
    await expect(page.getByRole('button', { name: /重置视角|自动旋转|缩小模型|放大模型/ })).toHaveCount(0);
    const box = (await food.boundingBox())!;
    const canvas = page.locator('canvas[data-engine]');
    const before = await canvas.getAttribute('data-rotation-y');
    await page.mouse.move(box.x + box.width * .35, box.y + box.height * .5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * .65, box.y + box.height * .6, { steps: 10 });
    await page.mouse.up();
    await expect(canvas).not.toHaveAttribute('data-rotation-y', before!);
    await expect(page.getByTestId('experience')).toHaveAttribute('data-bites', '0');
    await food.focus();
    await page.keyboard.press('Space');
    await expect(page.getByTestId('experience')).toHaveAttribute('data-bites', '1');
  });
}
