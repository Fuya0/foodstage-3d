import { test, expect } from '@playwright/test';

test.use({ hasTouch: true });

for (const width of [390, 1440]) {
  test(`detail supports unrestricted pitch and yaw with touch cancellation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/?mode=takeaway');
    await page.getByRole('button', { name: '查看经典汉堡', exact: true }).click();
    const preview = page.getByTestId('menu-model-preview');
    await expect(preview).toHaveAttribute('data-ready', 'true');
    await preview.scrollIntoViewIfNeeded();
    const bounds = (await preview.boundingBox())!;
    const x = bounds.x + bounds.width / 2;
    const y = bounds.y + bounds.height / 2;
    await page.mouse.move(x, y - 90);
    await page.mouse.down();
    await page.mouse.move(x + 80, y + 90, { steps: 8 });
    await page.mouse.up();
    expect(Number(await preview.getAttribute('data-pitch'))).toBeGreaterThan(Math.PI / 2);
    expect(Number(await preview.getAttribute('data-rotation'))).toBeGreaterThan(1);
    const pitch = Number(await preview.getAttribute('data-pitch'));
    await page.mouse.move(x, y - 90);
    await page.mouse.down();
    await page.mouse.move(x, y + 90, { steps: 8 });
    await page.mouse.up();
    const fullTurn = Number(await preview.getAttribute('data-pitch'));
    expect(fullTurn).toBeGreaterThan(2 * Math.PI);
    expect(fullTurn).toBeGreaterThan(pitch + Math.PI / 2);
    await page.mouse.move(x, y + 90);
    await page.mouse.down();
    await page.mouse.move(x - 80, y - 90, { steps: 8 });
    await page.mouse.up();
    expect(Number(await preview.getAttribute('data-pitch'))).toBeLessThan(fullTurn - 2);
    expect(Number(await preview.getAttribute('data-rotation'))).toBeLessThan(0.1);

    const session = await page.context().newCDPSession(page);
    const scroll = await page.evaluate(() => window.scrollY);
    const touchPitch = Number(await preview.getAttribute('data-pitch'));
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y - 60 }] });
    for (let dy = -40; dy <= 60; dy += 20) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + dy }] });
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await expect.poll(async () => Number(await preview.getAttribute('data-pitch'))).toBeGreaterThan(touchPitch + 1.5);
    expect(await page.evaluate(() => window.scrollY)).toBe(scroll);
    const cancelled = await preview.getAttribute('data-pitch');
    await page.mouse.move(x, y);
    expect(await preview.getAttribute('data-pitch')).toBe(cancelled);
    await expect(page.locator('.ordering-detail')).toBeVisible();
    await session.detach();
  });
}
