import { test, expect } from '@playwright/test';
for (const width of [390, 1440]) {
  test(`new food image cards open rotating 3D details at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/?mode=dine-in&guests=2');
    for (const name of ['黄金炸鸡腿', '芒果芝士蛋糕']) {
      const card = page.locator('.ordering-food-card').filter({ has: page.getByRole('heading', { name, exact: true }) });
      const image = card.getByRole('img', { name, exact: true });
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      await expect(card.getByTestId('menu-model-preview')).toHaveCount(0);
      await expect(page.getByRole('heading', { name: '食刻开饭！', exact: true })).toBeVisible();
      await card.getByRole('button', { name: `查看${name}`, exact: true }).click();
      const detail = page.locator('.ordering-detail');
      await expect(detail.getByRole('heading', { name, exact: true })).toBeVisible();
      const preview = detail.getByTestId('menu-model-preview');
      await expect(preview).toHaveAttribute('data-ready', 'true');
      const initial = await preview.getAttribute('data-rotation');
      const bounds = (await preview.boundingBox())!;
      await page.mouse.move(bounds.x + bounds.width * .35, bounds.y + bounds.height * .5);
      await page.mouse.down();
      await page.mouse.move(bounds.x + bounds.width * .70, bounds.y + bounds.height * .5, { steps: 10 });
      await page.mouse.up();
      await expect(preview).not.toHaveAttribute('data-rotation', initial!);
      await expect(detail.getByRole('button', { name: '虚拟试吃', exact: true })).toBeVisible();
      await page.screenshot({ path: `.codex/screenshots/showcase-browser/menu-${name}-${width}.png` });
      await detail.getByRole('button', { name: '返回菜单', exact: true }).click();
      await expect(card.getByRole('img', { name, exact: true })).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
}
