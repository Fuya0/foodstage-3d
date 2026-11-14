import { test, expect } from '@playwright/test';

test.use({ hasTouch: true });

for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
  test(`carousel remains accessible and interactive at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/?mode=takeaway');
    const strip = page.locator('.food-loop-window');
    await expect(strip).toBeVisible();
    const item = strip.locator('button[data-index]').first();
    const bounds = (await item.boundingBox())!;
    const window = (await strip.boundingBox())!;
    const point = { x: Math.min(bounds.x + bounds.width - 12, window.x + window.width - 12), y: window.y + 80 };
    await page.mouse.move(point.x, point.y);
    // Both samples MUST be after hover: a sample before mouse.move gives false greens.
    await page.waitForTimeout(80);
    await expect.poll(async () => {
      const hoveredPosition = await item.evaluate(el => el.getBoundingClientRect().left);
      await page.waitForTimeout(450);
      const nextPosition = await item.evaluate(el => el.getBoundingClientRect().left);
      return Math.abs(nextPosition - hoveredPosition);
    }, { timeout: 5000, intervals: [120] }).toBeGreaterThan(3);
    const movingBounds = (await item.boundingBox())!;
    point.x = Math.min(movingBounds.x + movingBounds.width - 12, window.x + window.width - 12);
    await page.mouse.move(point.x, point.y);
    const pointed = () => page.evaluate(({ x, y }) => {
      const items = [...document.querySelectorAll<HTMLElement>('.food-loop-item')];
      const boundaryDistance = Math.min(...items.flatMap(item => {
        const bounds = item.getBoundingClientRect();
        return [Math.abs(x - bounds.left), Math.abs(x - bounds.right)];
      }));
      return {
        pointed: document.elementFromPoint(x, y)?.closest<HTMLElement>('.food-loop-item')?.dataset.index,
        active: document.querySelector<HTMLElement>('.food-loop-item[data-active="true"]')?.dataset.index,
        boundaryDistance,
      };
    }, point);
    const indices = new Set<string>();
    let interiorSamples = 0;
    for (let i = 0; i < 8; i++) {
      const state = await pointed();
      expect(state.active).toBeDefined();
      // Native hit regions can snap across a fractional edge by less than one CSS pixel.
      if (state.boundaryDistance > 1) {
        expect(state.active).toBe(state.pointed);
        interiorSamples++;
      }
      indices.add(state.active!);
      await page.waitForTimeout(120);
    }
    expect(interiorSamples).toBeGreaterThanOrEqual(2);
    expect(indices.size).toBeGreaterThan(1);
    await expect(strip.locator('[data-active="true"] strong')).toHaveCSS('text-decoration-line', 'underline');
    await page.mouse.move(0, 0);
    await expect(strip.locator('[data-active="true"]')).toHaveCount(0);
    await page.getByRole('button', { name: '暂停滚动' }).click();
    const pausedPosition = await item.evaluate(el => el.getBoundingClientRect().left);
    await page.waitForTimeout(200);
    expect(await item.evaluate(el => el.getBoundingClientRect().left)).toBe(pausedPosition);
    await page.getByRole('button', { name: '继续滚动' }).click();
    await page.mouse.move(window.x + 20, window.y + 80);
    await strip.focus();
    await page.keyboard.press('End');
    const last = strip.locator('button[data-index]').last();
    await expect(last).toBeFocused();
    await expect(last).toHaveAttribute('data-active', 'true', { timeout: 2000 });
  });

  test(`carousel touch, drag and reduced motion at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/?mode=takeaway');
    const strip = page.locator('.food-loop-window');
    await expect(strip).toBeVisible();
    await expect(page.getByRole('button', { name: '暂停滚动' })).toHaveCount(0);
    const item = strip.locator('button[data-index]').first();
    const initial = await item.evaluate(el => el.getBoundingClientRect().left);
    await page.waitForTimeout(180);
    expect(await item.evaluate(el => el.getBoundingClientRect().left)).toBe(initial);
    const bounds = (await strip.boundingBox())!;
    const x = bounds.x + bounds.width / 2;
    const y = bounds.y + bounds.height / 2;
    const session = await page.context().newCDPSession(page);
    await strip.press('Home');
    await expect(item).toHaveAttribute('data-active', 'true');
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await expect(item).toHaveAttribute('data-active', 'true');
    await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await expect(strip.locator('[data-active="true"]')).toHaveCount(0);
    await expect(page.locator('.ordering-detail')).toHaveCount(0);
    await strip.press('Home');
    await expect(item).toHaveAttribute('data-active', 'true');
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 90, y }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(strip.locator('[data-active="true"]')).toHaveCount(0);
    await expect(page.locator('.ordering-detail')).toHaveCount(0);
    expect(await item.evaluate(el => el.getBoundingClientRect().left)).not.toBe(initial);
    await strip.press('Home');
    await page.keyboard.press('Tab');
    await page.mouse.move(0, 0);
    await page.touchscreen.tap(x, y);
    await expect(page.locator('.ordering-detail')).toBeVisible();
    await session.detach();
  });
}
