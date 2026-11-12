const puppeteer = require('/Users/wushengwei/.workbuddy/binaries/node/workspace/node_modules/puppeteer');
const fs = require('fs');
const path = require('path');
const BASE = 'http://127.0.0.1:5190/?table=A01';
const OUT = path.join(__dirname, '截图');
fs.mkdirSync(OUT, { recursive: true });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const log = [];
const errors = [];
function say(line) { log.push(line); console.log(line); }
async function clickText(page, text, selector = 'button') {
  const handle = await page.evaluateHandle((t, s) => [...document.querySelectorAll(s)].find(el => (el.textContent || '').includes(t)) || null, text, selector);
  const element = handle.asElement();
  if (!element) throw new Error('找不到元素: ' + text);
  await element.click();
  await wait(180);
}
async function snap(page, name, fullPage = false) {
  await page.screenshot({ path: path.join(OUT, name), fullPage });
  say('截图 ' + name);
}
async function assertText(page, selector, expected) {
  const value = await page.$eval(selector, el => el.textContent || '');
  if (!value.includes(expected)) throw new Error(`${selector} 应包含 ${expected}，实际为 ${value}`);
  say(`通过：${expected}`);
}
async function noOverflow(page, label) {
  const size = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
  if (size.scroll > size.width + 1) throw new Error(`${label} 横向溢出 ${size.scroll} > ${size.width}`);
  say(`通过：${label} 无横向溢出`);
}
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    await page.goto(BASE, { waitUntil: 'networkidle0' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-screen="welcome"]');
    if (await page.$('.dish-note') || await page.$('.view-tools')) throw new Error('首页推荐牌或视角控件仍存在');
    say('通过：首页无黄色推荐牌、缩放或复位控件');
    await snap(page, '01_手机_封面.png');
    await noOverflow(page, '手机封面');
    await clickText(page, '翻开菜单');
    await page.waitForSelector('[data-screen="menu"]');
    await snap(page, '02_手机_菜单.png');
    await noOverflow(page, '手机菜单');
    const tastingEntries = await page.$$eval('.card-tasting', elements => elements.length);
    if (tastingEntries !== 3) throw new Error('招牌菜单试吃入口数量不正确: ' + tastingEntries);
    await page.click('.dish-card[data-dish="tom-yum"] .card-tasting');
    await page.waitForSelector('[data-screen="tasting"]');
    await assertText(page, '.tasting-copy h1', '冬阴功虾汤');
    if (await page.$('.tasting-paper > button')) throw new Error('试吃重置按钮仍存在');
    say('通过：菜单卡片直达冬阴功试吃，且无重置按钮');
    await clickText(page, '合上试吃页');
    await clickText(page, '继续翻菜单');

    await page.click('.dish-card[data-dish="satay"] .dish-card-open');
    await page.waitForSelector('[data-screen="detail"]');
    await page.waitForFunction(() => Number.isFinite(Number(document.querySelector('.sketch-dish-object')?.dataset.yaw)));
    const beforeYaw = await page.$eval('.sketch-dish-object', el => Number(el.dataset.yaw));
    const box = await (await page.$('.detail-visual .sketch-stage')).boundingBox();
    await page.mouse.move(box.x + box.width * .45, box.y + box.height * .45);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * .75, box.y + box.height * .48, { steps: 12 });
    await page.mouse.up();
    await wait(160);
    const afterYaw = await page.$eval('.sketch-dish-object', el => Number(el.dataset.yaw));
    if (Math.abs(afterYaw - beforeYaw) < 10) throw new Error('拖动没有改变视角');
    say(`通过：拖转视角 ${beforeYaw} → ${afterYaw}`);
    await clickText(page, '10 串');
    await clickText(page, '青柠辣酱');
    await page.click('.detail-order-row .quantity-control button:last-child');
    await page.type('.note-field input', '蘸酱另放');
    await snap(page, '03_手机_菜品详情.png');
    await clickText(page, '夹进小票');
    await assertText(page, '.toast', '沙嗲鸡串 × 2');

    await clickText(page, '开始虚拟试吃');
    await page.waitForSelector('[data-screen="tasting"] canvas');
    await wait(300);
    const canvas = await (await page.$('.tasting-canvas-wrap canvas')).boundingBox();
    for (let i = 0; i < 12; i++) {
      await page.mouse.click(canvas.x + canvas.width * (.42 + (i % 3) * .06), canvas.y + canvas.height * (.43 + (i % 2) * .06));
      await wait(90);
      if (i === 2) await snap(page, '04_手机_试吃咬痕.png');
    }
    const bites = await page.$eval('canvas[data-bites]', el => Number(el.dataset.bites));
    if (bites !== 12) throw new Error('试吃未完成 12 口，实际 ' + bites);
    say('通过：试吃 12 口与完成印章');
    await snap(page, '05_手机_试吃完成.png');
    await clickText(page, '合上试吃页');
    await clickText(page, '小票');
    await page.waitForSelector('[data-screen="cart"]');
    await assertText(page, '.sheet-total', '¥172.00');
    await page.click('.cart-line .quantity-control button:last-child');
    await assertText(page, '.sheet-total', '¥258.00');
    say('通过：购物车改数量并重新计价');
    await snap(page, '06_手机_购物车.png');

    await clickText(page, '再翻几道');
    await clickText(page, '主食', '.category-tabs button');
    await page.click('.dish-card[data-dish="tom-yum"] .dish-card-open');
    await clickText(page, '两人分享');
    await clickText(page, '多加两只虾');
    await clickText(page, '夹进小票');
    await clickText(page, '小票');
    await assertText(page, '.sheet-total', '¥372.00');
    await clickText(page, '核对这桌菜');
    await page.waitForSelector('[data-screen="checkout"]');
    await snap(page, '07_手机_核对订单.png');
    await clickText(page, '提交演示订单');
    await page.waitForSelector('[data-screen="receipt"]');
    await assertText(page, '.receipt-total', '¥372.00');
    await snap(page, '08_手机_回执.png');
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-screen="receipt"]');
    say('通过：刷新后仍保留回执');

    await clickText(page, '再点一桌');
    await clickText(page, '小食', '.category-tabs button');
    await page.click('.dish-card[data-dish="papaya"] .dish-card-open');
    const soldOut = await page.$eval('.add-button', el => el.disabled);
    if (!soldOut) throw new Error('售罄菜品仍可加入');
    say('通过：售罄菜品禁止加入');
    await page.click('.icon-button');
    await page.waitForSelector('.settings-dialog[open]');
    await page.click('button[aria-label="减少动态"]');
    const reduced = await page.evaluate(() => document.documentElement.dataset.reduced);
    if (reduced !== 'true') throw new Error('减少动态未生效');
    say('通过：减少动态设置');
    await page.click('.round-close');

    const desktop = await browser.newPage();
    desktop.on('pageerror', error => errors.push(error.message));
    await desktop.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await desktop.goto(BASE, { waitUntil: 'networkidle0' });
    await desktop.evaluate(() => localStorage.clear());
    await desktop.reload({ waitUntil: 'networkidle0' });
    await snap(desktop, '09_桌面_封面.png');
    await noOverflow(desktop, '桌面封面');
    await clickText(desktop, '翻开菜单');
    await snap(desktop, '10_桌面_菜单.png');
    await noOverflow(desktop, '桌面菜单');
    await desktop.click('.dish-card[data-dish="tom-yum"] .dish-card-open');
    await snap(desktop, '11_桌面_详情.png');
    await noOverflow(desktop, '桌面详情');

    if (errors.length) throw new Error('页面错误: ' + errors.join(' | '));
    say('通过：浏览器页面错误 0');
    fs.writeFileSync(path.join(__dirname, '验收记录.txt'), log.join('\n') + '\n');
  } catch (error) {
    fs.writeFileSync(path.join(__dirname, '验收记录.txt'), log.join('\n') + '\n失败：' + error.stack + '\n');
    throw error;
  } finally {
    await browser.close();
  }
})();
