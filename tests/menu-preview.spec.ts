import { test, expect, type Locator, type Page } from '@playwright/test';
import { menuItemById, menuItems } from '../src/data/menu';

async function rotatePreview(page: Page, preview: Locator, stage: Locator = preview) {
  await stage.scrollIntoViewIfNeeded();
  await expect(preview).toHaveAttribute('data-ready', 'true');
  const bounds = (await stage.boundingBox())!;
  const before = await preview.getAttribute('data-rotation');
  await page.mouse.move(bounds.x + bounds.width * 0.25, bounds.y + bounds.height * 0.45);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.75, bounds.y + bounds.height * 0.45, { steps: 8 });
  await page.mouse.up();
  await expect(preview).not.toHaveAttribute('data-rotation', before!);
}

test('welcome shows the interactive burger on its own and respects reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const hero = page.locator('.welcome-hero-food');
  const floatingModel = hero.locator('[data-floating]');
  await expect(hero.locator('img, .food-holo-card')).toHaveCount(0);
  await expect(hero.getByTestId('menu-model-preview')).toHaveAttribute('data-ready', 'true');
  await expect(floatingModel).toHaveCSS('animation-name', 'food-holo-hover');
  await rotatePreview(page, hero.getByTestId('menu-model-preview'), hero);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(floatingModel).toHaveCount(0);
  await expect(hero.locator('canvas')).toBeVisible();
  await page.getByRole('button', { name: /堂食/ }).click();
  await expect(page.getByRole('dialog', { name: '几位用餐？' })).toBeVisible();
});

test('image cards and drink details preserve ordering while food details reuse mobile models', async ({ page }) => {
  const models: string[] = [];
  page.on('request', request => { if (/\.glb(?:\?|$)/.test(request.url())) models.push(request.url()); });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?table=A01&mode=dine-in&guests=2');
  const cards = page.locator('.ordering-food-card');
  await expect(cards.getByTestId('menu-model-preview')).toHaveCount(0);
  await expect(cards.locator('img')).toHaveCount(menuItems.length);
  await expect(page.locator('.ordering-menu')).toBeVisible();

  await page.getByRole('button', { name: '饮品', exact: true }).click();
  const drinkCount = menuItems.filter(item => item.category === '饮品').length;
  await expect(cards).toHaveCount(drinkCount);
  await expect(cards.locator('img')).toHaveCount(drinkCount);
  await page.getByRole('button', { name: '查看鲜柠气泡饮' }).click();
  const detailPreview = page.locator('.ordering-detail-art').getByTestId('menu-model-preview');
  await expect(detailPreview).toHaveCount(0);
  await expect(page.locator('.ordering-detail-art').getByRole('img', { name: '鲜柠气泡饮', exact: true })).toHaveAttribute('src', menuItemById('lemon-soda')!.cover);
  await expect(page.locator('.ordering-detail-art canvas')).toHaveCount(0);
  await page.getByRole('radio', { name: '少冰', exact: true }).check();
  await expect(page.getByRole('radio', { name: '少冰', exact: true })).toBeChecked();
  await expect(page.getByRole('button', { name: '虚拟试吃', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /加入点单/ })).toBeEnabled();
  expect(models.filter(url => /lemon-soda|coca-cola|sprite|fanta/.test(url))).toEqual([]);

  await page.getByRole('button', { name: /返回菜单/ }).click();
  await page.getByRole('button', { name: '全部', exact: true }).click();
  await page.getByRole('button', { name: '查看经典汉堡' }).click();
  await rotatePreview(page, detailPreview);
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: '经典汉堡' })).toBeVisible();
  expect(models.map(url => new URL(url).pathname)).toContain('/models-mobile/burger-0.glb');
  expect(models.filter(url => url.includes('/burger-'))).toHaveLength(1);
  await page.getByRole('button', { name: '返回菜单', exact: true }).click();
  await page.getByRole('button', { name: '饮品', exact: true }).click();
  await page.getByRole('button', { name: '全部', exact: true }).click();
  await page.getByRole('button', { name: '查看经典汉堡', exact: true }).click();
  await expect(detailPreview).toHaveAttribute('data-ready', 'true');
  expect(models.filter(url => url.includes('/burger-'))).toHaveLength(1);
});

test('all drinks use images without GLB requests and canned drinks remain orderable', async ({ page }) => {
  const drinkModels: string[] = [];
  page.on('request', request => {
    if (/\.glb(?:\?|$)/.test(request.url()) && /lemon-soda|coca-cola|sprite|fanta/.test(request.url())) drinkModels.push(request.url());
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?table=A01&mode=dine-in&guests=2');
  await page.getByRole('button', { name: '饮品', exact: true }).click();
  const cans = ['coca-cola', 'sprite', 'fanta-orange', 'coca-cola-no-sugar'].map(id => menuItemById(id)!);
  for (const can of menuItems.filter(item => item.category === '饮品')) {
    const card = page.locator('.ordering-food-card').filter({ has: page.getByRole('heading', { name: can.name, exact: true }) });
    const thumbnail = card.getByRole('img', { name: can.name, exact: true });
    await thumbnail.scrollIntoViewIfNeeded();
    await expect(thumbnail).toHaveAttribute('src', can.cover);
    await expect.poll(() => thumbnail.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect(card.locator('canvas')).toHaveCount(0);
    await card.getByRole('button', { name: `查看${can.name}`, exact: true }).click();
    const detail = page.locator('.ordering-detail');
    await expect(detail.getByRole('heading', { level: 1 })).toHaveText(can.name);
    const detailImage = detail.getByRole('img', { name: can.name, exact: true });
    await expect(detailImage).toHaveAttribute('src', can.cover);
    await expect.poll(() => detailImage.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect(detail.getByTestId('menu-model-preview')).toHaveCount(0);
    await expect(detail.locator('canvas')).toHaveCount(0);
    await expect(detail.getByRole('button', { name: '虚拟试吃', exact: true })).toHaveCount(0);
    if (can.unit === '罐') await detail.getByRole('button', { name: '加入点单', exact: true }).click();
    else await detail.getByRole('button', { name: '返回菜单', exact: true }).click();
  }
  await page.getByRole('button', { name: /查看购物车/ }).click();
  const lines = page.locator('.cart-lines li');
  await expect(lines).toHaveCount(cans.length);
  for (const can of cans) await expect(lines.getByRole('heading', { name: can.name, exact: true })).toBeVisible();
  const total = cans.reduce((sum, item) => sum + item.price, 0);
  await expect(page.locator('.order-total')).toContainText(`¥${(total / 100).toFixed(2)}`);
  expect(drinkModels).toEqual([]);
});

test('desktop image catalog keeps no-model sold-out details disabled', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?table=A01&mode=dine-in&guests=2');
  const cards = page.locator('.ordering-food-card');
  await expect(cards).toHaveCount(menuItems.length);
  await expect(cards.getByTestId('menu-model-preview')).toHaveCount(0);
  await expect(cards.locator('img')).toHaveCount(menuItems.length);
  const first = await cards.nth(0).boundingBox();
  const second = await cards.nth(1).boundingBox();
  expect(first).not.toBeNull();
  expect(second).not.toBeNull();
  expect(second!.y).toBeGreaterThan(first!.y + first!.height - 1);
  for (const card of await cards.all()) {
    await expect(card.locator('.ordering-food-thumbnail')).toHaveCount(1);
    await expect(card.locator('img')).toHaveCount(1);
  }
  const soldOut = cards.filter({ hasText: '黑松露帕玛森薯条' });
  await soldOut.scrollIntoViewIfNeeded();
  await expect(soldOut.getByRole('img', { name: '黑松露帕玛森薯条', exact: true })).toHaveAttribute('src', menuItemById('truffle-fries')!.cover);
  await soldOut.getByRole('button', { name: '查看黑松露帕玛森薯条' }).click();
  const art = page.locator('.ordering-detail-art');
  await expect(art.getByTestId('menu-model-preview')).toHaveCount(0);
  await expect(art.getByRole('img', { name: '黑松露帕玛森薯条', exact: true })).toHaveAttribute('src', menuItemById('truffle-fries')!.cover);
  await expect(art.locator('canvas')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '暂时售罄', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: '虚拟试吃', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '黑松露帕玛森薯条' })).toBeVisible();
});

for (const width of [390, 1440]) {
  test(`menu model loop can be dragged, clicked and navigated by keyboard at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const coverRequests: string[] = [];
    page.on('request', request => {
      if (new URL(request.url()).pathname.startsWith('/foods/')) coverRequests.push(request.url());
    });
    await page.goto('/?table=A01&mode=dine-in&guests=2');
    const loop = page.getByRole('region', { name: '招牌菜滚动展示' });
    const strip = loop.locator('.food-loop-window');
    const featured = menuItems.filter(item => item.available && item.foodId && item.category !== '饮品');
    const featuredModelIds = featured.map(item => item.modelFoodId ?? item.foodId!);
    const loadedModels = loop.locator('.food-carousel-models');
    await expect.poll(async () => {
      const loaded = (await loadedModels.getAttribute('data-loaded-models') ?? '').split(/\s+/).filter(Boolean);
      return loaded.length > 0 && loaded.every(id => featuredModelIds.includes(id));
    }).toBe(true);
    await expect(loop.locator('canvas')).toHaveCount(1);
    await expect(loop).toBeVisible();
    expect(coverRequests.every(url => new URL(url).pathname.startsWith('/foods/'))).toBe(true);
    for (const item of featured) {
      const label = loop.getByRole('button', { name: `打开${item.name}详情`, exact: true }).first();
      await expect(label).toContainText(item.name);
      await expect(label).toContainText((item.price / 100).toFixed(2));
    }

    await strip.scrollIntoViewIfNeeded();
    const bounds = (await strip.boundingBox())!;
    const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
    const centeredIndex = () => page.evaluate(({ x, y }) =>
      document.elementFromPoint(x, y)?.closest<HTMLButtonElement>('.food-loop-item')?.dataset.index, center);

    await strip.press('Home');
    await expect.poll(centeredIndex).toBe('0');
    await page.mouse.move(bounds.x + bounds.width * 0.8, center.y);
    await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width * 0.2, center.y, { steps: 12 });
    await page.mouse.up();
    await expect.poll(centeredIndex).toMatch(/^[1-9]\d*$/);
    await expect(loop).toBeVisible();
    await expect(page.locator('.ordering-detail')).toHaveCount(0);

    await strip.press('Home');
    await expect.poll(centeredIndex).toBe('0');
    await page.mouse.click(center.x, center.y);
    const detail = page.locator('.ordering-detail');
    await expect(detail.getByRole('heading', { name: featured[0]!.name, exact: true })).toBeVisible();
    await rotatePreview(page, detail.getByTestId('menu-model-preview'));
    await page.getByRole('button', { name: '返回菜单' }).click();
    await strip.press('Home');
    await strip.press('ArrowRight');
    await expect.poll(centeredIndex).toBe('1');
    await strip.press('ArrowLeft');
    await expect.poll(centeredIndex).toBe('0');
    await strip.press('ArrowRight');
    await strip.press('Enter');
    await expect(detail.getByRole('heading', { name: featured[1]!.name, exact: true })).toBeVisible();
    await expect(detail.getByTestId('menu-model-preview')).toHaveAttribute('data-ready', 'true');
  });
}

test('burger detail preview resumes after scrolling out of view', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 480 });
  await page.goto('/?table=A01&mode=dine-in&guests=2');
  await page.getByRole('button', { name: '查看经典汉堡', exact: true }).click();
  const preview = page.locator('.ordering-detail-art').getByTestId('menu-model-preview');
  await preview.scrollIntoViewIfNeeded();
  await expect(preview).toHaveAttribute('data-ready', 'true');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(preview.locator('canvas')).toHaveCount(0);
  // R3F releases its WebGL context asynchronously after unmount.
  await page.waitForTimeout(1000);
  await preview.scrollIntoViewIfNeeded();
  await expect(preview).toHaveAttribute('data-ready', 'true', { timeout: 10000 });
});

test('failed detail model leaves image cards and ordering usable and retries on reopening', async ({ page }) => {
  let fail = true;
  await page.route('**/models-mobile/burger-0.glb', route => fail ? route.abort() : route.continue());
  await page.goto('/?table=A01&mode=dine-in&guests=2');
  await expect(page.locator('.ordering-food-card').first().locator('img')).toBeVisible();
  await page.getByRole('button', { name: '查看经典汉堡' }).click();
  await expect(page.locator('.ordering-detail-art').getByTestId('menu-model-preview')).toContainText('加载失败');
  await expect(page.getByRole('button', { name: /加入点单/ })).toBeEnabled();
  fail = false;
  await page.getByRole('button', { name: /返回菜单/ }).click();
  await page.getByRole('button', { name: '查看经典汉堡', exact: true }).click();
  const preview = page.locator('.ordering-detail-art').getByTestId('menu-model-preview');
  await preview.scrollIntoViewIfNeeded();
  await expect(preview).toHaveAttribute('data-ready', 'true');
});
