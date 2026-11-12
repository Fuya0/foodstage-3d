import { getDish } from "../data";
import type { CartLine, Receipt, Session } from "../types";

export const SESSION_KEY = "siam-shike-sketch-session-v1";
export const SETTINGS_KEY = "siam-shike-sketch-settings-v1";

export function defaultChoices(dishId: string) {
  return Object.fromEntries(getDish(dishId).options.map((group) => [group.id, group.choices[0].id]));
}

export function lineKey(dishId: string, choices: Record<string, string>, note: string) {
  const normalized = Object.entries(choices).sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify([dishId, normalized, note.trim()]);
}

export function unitPrice(line: CartLine) {
  const dish = getDish(line.dishId);
  return dish.options.reduce((sum, group) => {
    const selected = line.choices[group.id] ?? group.choices[0].id;
    const choice = group.choices.find((item) => item.id === selected);
    if (!choice) throw new Error("选项已失效");
    return sum + choice.delta;
  }, dish.price);
}

export function lineTotal(line: CartLine) {
  return unitPrice(line) * line.quantity;
}

export function cartTotal(lines: CartLine[]) {
  return lines.reduce((sum, line) => sum + lineTotal(line), 0);
}

export function choiceLabels(line: CartLine) {
  const dish = getDish(line.dishId);
  return dish.options.map((group) => {
    const selected = line.choices[group.id] ?? group.choices[0].id;
    return group.choices.find((item) => item.id === selected)?.label ?? "未知选项";
  });
}

export function addLine(lines: CartLine[], incoming: CartLine) {
  const existing = lines.find((line) => line.key === incoming.key);
  if (!existing) return [...lines, incoming];
  return lines.map((line) => line.key === incoming.key ? { ...line, quantity: line.quantity + incoming.quantity } : line);
}

export function changeQuantity(lines: CartLine[], key: string, delta: number) {
  return lines
    .map((line) => line.key === key ? { ...line, quantity: Math.max(0, Math.min(20, line.quantity + delta)) } : line)
    .filter((line) => line.quantity > 0);
}

export function makeReceipt(session: Session, now = new Date(), random = Math.random()) {
  if (session.mode === "dine-in" && !session.table.trim()) throw new Error("请填写桌号");
  if (!session.lines.length) throw new Error("菜单还是空的");
  const stamp = now.toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = Math.floor(random * 46656).toString(36).toUpperCase().padStart(3, "0");
  const receipt: Receipt = {
    id: `SIAM-${stamp}-${suffix}`,
    createdAt: now.toISOString(),
    lines: session.lines,
    total: cartTotal(session.lines),
    mode: session.mode,
    guests: session.guests,
    table: session.table.trim(),
  };
  return receipt;
}

export function emptySession(mode: "dine-in" | "takeaway" = "dine-in", table = "A01"): Session {
  return { mode, guests: 2, table, lines: [], receipt: null };
}

export function readSession(): Session {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return emptySession("dine-in", new URLSearchParams(location.search).get("table") || "A01");
    const parsed = JSON.parse(raw) as Session;
    const lines = parsed.lines.filter((line) => {
      try {
        const dish = getDish(line.dishId);
        return dish.available && line.quantity > 0 && unitPrice(line) >= 0;
      } catch { return false; }
    });
    return {
      mode: parsed.mode === "takeaway" ? "takeaway" : "dine-in",
      guests: Math.max(1, Math.min(12, Number(parsed.guests) || 2)),
      table: String(parsed.table || "A01"),
      lines,
      receipt: parsed.receipt ?? null,
    };
  } catch {
    return emptySession();
  }
}
