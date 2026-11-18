import { describe, expect, it } from "vitest";
import { restaurantLinks, stores } from "./config";

describe("美食街店铺配置", () => {
  it("提供两家可进入的营业店", () => {
    const openStores = stores.filter((store) => store.status === "open");
    expect(openStores.map((store) => store.id)).toEqual(["burger", "siam"]);
    expect(openStores.every((store) => Boolean(store.href))).toBe(true);
  });

  it("三家装修店不包含跳转地址", () => {
    const renovatingStores = stores.filter((store) => store.status === "renovating");
    expect(renovatingStores).toHaveLength(3);
    expect(renovatingStores.every((store) => store.href === undefined)).toBe(true);
  });

  it("默认本地餐厅地址合法且彼此不同", () => {
    expect(new URL(restaurantLinks.burger).hostname).toBe("127.0.0.1");
    expect(new URL(restaurantLinks.siam).hostname).toBe("127.0.0.1");
    expect(restaurantLinks.burger).not.toBe(restaurantLinks.siam);
  });
});
