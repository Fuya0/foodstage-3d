import { test, expect, type Page } from '@playwright/test';

async function idle(page: Page, stage: number) {
  await expect(page.getByTestId('experience')).toHaveAttribute('data-stage', String(stage));
  await expect(page.getByTestId('experience')).toHaveAttribute('data-phase', 'idle');
}
async function bites(page: Page, count: number) {
  const area = page.getByRole('button', { name: '汉堡，轻点吃一口，拖动旋转' });
  await area.focus();
  for (let i = 0; i < count; i++) await page.keyboard.press('Space');
}
test('real model, drag isolation, eight-bite transition and 32-bite replay', async ({ page }) => {
  const failures: string[] = [];
  page.on('pageerror', error => failures.push(error.message));
  page.on('console', message => { if (message.type() === 'error') failures.push(message.text()); });
  const loaded = page.waitForResponse(response => response.url().endsWith('burger-0.glb') && response.ok());
  await page.goto('/'); await loaded; await idle(page, 0);
  await expect(page.locator('canvas')).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/desktop-initial.png' });
  const area = page.getByRole('button', { name: '汉堡，轻点吃一口，拖动旋转' });
  const box = (await area.boundingBox())!;
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x + 90, y + 40, { steps: 8 }); await page.mouse.move(x, y); await page.mouse.up();
  await expect(page.getByTestId('experience')).toHaveAttribute('data-bites', '0');
  // Actual scene raycast input, not just DOM keyboard handling.
  await page.mouse.click(x, y);
  await expect(page.getByTestId('experience')).toHaveAttribute('data-bites', '1');
  await page.screenshot({ path: 'docs/screenshots/desktop.png' });
  await bites(page, 7);
  await expect(page.getByTestId('experience')).toHaveAttribute('data-phase', 'eating');
  await expect.poll(() => page.locator('canvas').evaluate(canvas => Number(getComputedStyle(canvas).opacity))).toBeLessThan(1);
  await idle(page, 1);
  for (let stage = 1; stage < 4; stage++) { await bites(page, 8); if (stage < 3) await idle(page, stage + 1); }
  await expect(page.getByRole('button', { name: '再吃一次' })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/finished.png' });
  await page.getByRole('button', { name: '再吃一次' }).click(); await idle(page, 0);
  await expect(page.getByTestId('experience')).toHaveAttribute('data-bites', '0');
  expect(failures).toEqual([]);
});

test('failed next asset retains full progress and model until retry succeeds', async ({ page }) => {
  let fail = true;
  await page.route('**/burger-1.glb', route => fail ? route.fulfill({ status: 503, body: 'temporary failure' }) : route.continue());
  await page.goto('/'); await idle(page, 0); await bites(page, 8);
  await expect(page.getByTestId('experience')).toHaveAttribute('data-phase', 'waiting');
  await expect(page.getByTestId('experience')).toHaveAttribute('data-bites', '8');
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: '重试加载' })).toBeVisible();
  fail = false; await page.getByRole('button', { name: '重试加载' }).click(); await idle(page, 1);
});

test('mobile layout fits and reduced-motion completes transitions', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/'); await idle(page, 0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'docs/screenshots/mobile.png' });
  await bites(page, 8); await idle(page, 1);
});
