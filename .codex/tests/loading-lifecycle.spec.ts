import { test, expect, type Request } from '@playwright/test';

for (const width of [390, 1440]) {
  for (const stage of [0, 1]) {
    test(`leaving tasting during stage ${stage} cancels download without breaking detail or reentry at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      let release!: () => void;
      const gate = new Promise<void>(resolve => { release = resolve; });
      let sawFirst!: () => void;
      const held = new Promise<void>(resolve => { sawFirst = resolve; });
      let first: Request | undefined;
      let aborted = false;
      const later: string[] = [];
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('requestfailed', request => { if (request === first) aborted = true; });
      page.on('request', request => {
        const match = /\/models-(?:mobile|desktop)\/burger-([0-3])\.glb/.exec(request.url());
        if (match && Number(match[1]) > stage) later.push(new URL(request.url()).pathname);
      });
      await page.route(`**/models-*/burger-${stage}.glb`, async route => {
        if (!first) { first = route.request(); sawFirst(); await gate; }
        await route.continue().catch(() => {});
      });
      try {
        await page.goto('/?table=A01&item=classic-burger&view=tasting');
        await held;
        if (stage === 1) await expect(page.getByRole('button', { name: '经典汉堡', exact: true })).toHaveAttribute('data-hit-ready', 'true');
        await page.getByRole('button', { name: '返回菜品', exact: true }).click();
        release();
        const detail = page.locator('.ordering-detail');
        await expect(detail).toBeVisible();
        await expect(detail.getByTestId('menu-model-preview')).toHaveAttribute('data-ready', 'true');
        await expect.poll(() => aborted).toBe(true);
        await page.waitForTimeout(1000);
        expect(later).toEqual([]);
        await detail.getByRole('button', { name: '虚拟试吃', exact: true }).click();
        await expect(page.getByRole('button', { name: '经典汉堡', exact: true })).toHaveAttribute('data-hit-ready', 'true');
        await expect(page.getByRole('button', { name: '重试加载', exact: true })).toHaveCount(0);
        expect(errors).toEqual([]);
      } finally { release(); }
    });
  }
}

test('menu has no carousel pause control', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/?mode=takeaway');
  await expect(page.getByRole('region', { name: '招牌菜滚动展示' })).toBeVisible();
  await expect(page.getByRole('button', { name: /暂停滚动|继续滚动/ })).toHaveCount(0, { timeout: 1500 });
});
