import { describe, expect, it } from "vitest";
import { addLine, cartTotal, changeQuantity, defaultChoices, lineKey, lineTotal, makeReceipt, unitPrice } from "./order";
import { emptySession } from "./order";
import type { CartLine } from "../types";

function satay(note = ""): CartLine {
  const choices = { ...defaultChoices("satay"), count: "ten", sauce: "lime" };
  return { key: lineKey("satay", choices, note), dishId: "satay", choices, note, quantity: 2 };
}

describe("手绘菜单计价", () => {
  it("读取新菜单默认规格", () => {
    expect(defaultChoices("tom-yum")).toEqual({ size: "one", spice: "gentle", shrimp: "regular" });
  });

  it("份量和蘸酱加价进入单价", () => {
    expect(unitPrice(satay())).toBe(8600);
    expect(lineTotal(satay())).toBe(17200);
  });

  it("只有菜品、规格和备注都相同才合并", () => {
    const first = satay();
    const merged = addLine([], first);
    const same = addLine(merged, { ...first, quantity: 1 });
    expect(same).toHaveLength(1);
    expect(same[0].quantity).toBe(3);
    const noted = satay("酱料另放");
    expect(addLine(same, noted)).toHaveLength(2);
    const other = satay();
    other.choices = { ...other.choices, count: "five" };
    other.key = lineKey(other.dishId, other.choices, other.note);
    expect(addLine(same, other)).toHaveLength(2);
  });

  it("数量减到零时移除该行", () => {
    const lines = changeQuantity([satay()], satay().key, -2);
    expect(lines).toEqual([]);
  });

  it("整单金额读取同一份菜单定义", () => {
    const tomChoices = { ...defaultChoices("tom-yum"), size: "share", shrimp: "extra" };
    const tom = { key: lineKey("tom-yum", tomChoices, ""), dishId: "tom-yum", choices: tomChoices, note: "", quantity: 1 };
    expect(cartTotal([satay(), tom])).toBe(28600);
  });

  it("堂食提交需要桌号并生成可核对回执", () => {
    const session = { ...emptySession(), table: "", lines: [satay()] };
    expect(() => makeReceipt(session)).toThrow("请填写桌号");
    const receipt = makeReceipt({ ...session, table: "B06" }, new Date("2026-11-12T12:00:00.000Z"), 0.5);
    expect(receipt.id).toMatch(/^SIAM-20261112-/);
    expect(receipt.total).toBe(17200);
    expect(receipt.table).toBe("B06");
  });

  it("空菜单不能提交", () => {
    expect(() => makeReceipt(emptySession())).toThrow("菜单还是空的");
  });
});
