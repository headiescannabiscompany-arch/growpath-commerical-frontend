export type InventoryQuantityLike = {
  qty?: unknown;
  quantity?: unknown;
  quantityOnHand?: unknown;
  onHand?: unknown;
  count?: unknown;
  unit?: unknown;
  uom?: unknown;
};

export type InventoryQuantityGroup = {
  unit: string;
  quantity: number;
};

function quantityOf(item: InventoryQuantityLike) {
  const value =
    item.qty ?? item.quantity ?? item.quantityOnHand ?? item.onHand ?? item.count ?? 0;
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

/** Keeps unlike stock-counting units separate so a dashboard never adds bags to liters. */
export function groupInventoryQuantities(
  items: InventoryQuantityLike[]
): InventoryQuantityGroup[] {
  const groups = new Map<string, InventoryQuantityGroup>();
  for (const item of items) {
    const displayUnit = String(item.unit ?? item.uom ?? "").trim() || "unit not set";
    const key = displayUnit.toLocaleLowerCase();
    const group = groups.get(key) || { unit: displayUnit, quantity: 0 };
    group.quantity += quantityOf(item);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => a.unit.localeCompare(b.unit));
}

export function inventoryQuantitySummary(items: InventoryQuantityLike[]) {
  return groupInventoryQuantities(items)
    .map(({ quantity, unit }) => `${quantity} ${unit}`)
    .join(" · ");
}
