import { expect, test } from "@playwright/test";

test("桌面开始页进入选店页，店铺状态与跳转地址正确", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".welcome-copy h1")).toHaveText("食刻美食街");
  await page.screenshot({ path: "shots/welcome-1440.png", fullPage: true });
  await page.getByRole("button", { name: "开街逛逛" }).click();
  await expect(page).toHaveURL(/#shops$/);
  await expect(page.locator("[data-status='open']")).toHaveCount(2);
  await expect(page.locator("[data-status='renovating']")).toHaveCount(3);
  await expect(page.locator("[data-store='burger']")).toHaveAttribute("href", "http://127.0.0.1:5174/?table=A01");
  await expect(page.locator("[data-store='siam']")).toHaveAttribute("href", "http://127.0.0.1:5173/");
  await expect(page.locator("article[data-store='noodle']")).toHaveAttribute("aria-label", "巷口面馆，正在装修");
  await page.screenshot({ path: "shots/shops-1440.png", fullPage: true });
  await page.getByRole("button", { name: "返回街口" }).click();
  await expect(page.getByRole("button", { name: "开街逛逛" })).toBeVisible();
});

test("营业店点击后进入对应本地点单系统", async ({ page }) => {
  await page.route(/http:\/\/127\.0\.0\.1:5174\/.*/, (route) => route.fulfill({ contentType: "text/html", body: "burger ordering" }));
  await page.goto("/#shops");
  await page.locator("[data-store='burger']").click();
  await expect(page).toHaveURL("http://127.0.0.1:5174/?table=A01");
  await expect(page.locator("body")).toHaveText("burger ordering");
});

test("暹罗食刻点击后进入对应本地点单系统", async ({ page }) => {
  await page.route(/http:\/\/127\.0\.0\.1:5173\/.*/, (route) => route.fulfill({ contentType: "text/html", body: "siam ordering" }));
  await page.goto("/#shops");
  await page.locator("[data-store='siam']").click();
  await expect(page).toHaveURL("http://127.0.0.1:5173/");
  await expect(page.locator("body")).toHaveText("siam ordering");
});

test("手机两页无横向溢出，装修店不可点击", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "shots/welcome-390.png", fullPage: true });
  await page.getByRole("button", { name: "开街逛逛" }).click();
  await expect(page.locator("[data-status='open']")).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "shots/shops-390.png", fullPage: true });
  await expect(page.locator("a[data-status='renovating']")).toHaveCount(0);
});

test("平板宽度布局完整且无横向溢出", async ({ page }) => {
  for (const width of [1024, 768]) {
    await page.setViewportSize({ width, height: width === 1024 ? 768 : 1024 });
    await page.goto("/#shops");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `shots/shops-${width}.png`, fullPage: true });
  }
});
