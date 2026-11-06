import type { InventoryEntry, StackOrderMap } from "./types";

export function sortZoneEntries(
  zoneId: string,
  entries: InventoryEntry[],
  stackOrder?: StackOrderMap,
): InventoryEntry[] {
  if (entries.length <= 1) return entries;
  const order = stackOrder?.[zoneId];
  if (!order?.length) return entries;

  const byProduct = new Map(entries.map((e) => [e.productId, e]));
  const sorted: InventoryEntry[] = [];
  for (const id of order) {
    const entry = byProduct.get(id);
    if (entry) {
      sorted.push(entry);
      byProduct.delete(id);
    }
  }
  for (const entry of byProduct.values()) sorted.push(entry);
  return sorted;
}

export function syncZoneOrder(
  stackOrder: StackOrderMap | undefined,
  zoneId: string,
  productIds: string[],
): string[] {
  const prev = stackOrder?.[zoneId] ?? [];
  const next: string[] = [];
  for (const id of prev) {
    if (productIds.includes(id)) next.push(id);
  }
  for (const id of productIds) {
    if (!next.includes(id)) next.push(id);
  }
  return next;
}

export function moveStackInOrder(
  stackOrder: StackOrderMap | undefined,
  zoneId: string,
  productId: string,
  direction: -1 | 1,
  productIds: string[],
): StackOrderMap {
  const order = syncZoneOrder(stackOrder, zoneId, productIds);
  const index = order.indexOf(productId);
  if (index < 0) return stackOrder ?? {};
  const target = index + direction;
  if (target < 0 || target >= order.length) {
    return stackOrder ?? (order.length ? { [zoneId]: order } : {});
  }

  const nextOrder = [...order];
  [nextOrder[index], nextOrder[target]] = [
    nextOrder[target],
    nextOrder[index],
  ];
  return { ...(stackOrder ?? {}), [zoneId]: nextOrder };
}

export function moveStackToIndex(
  stackOrder: StackOrderMap | undefined,
  zoneId: string,
  productId: string,
  insertIndex: number,
  productIds: string[],
): StackOrderMap {
  const order = syncZoneOrder(stackOrder, zoneId, productIds);
  const from = order.indexOf(productId);
  if (from < 0) return stackOrder ?? {};

  const without = order.filter((id) => id !== productId);
  const idx = Math.max(0, Math.min(without.length, insertIndex));
  without.splice(idx, 0, productId);
  return { ...(stackOrder ?? {}), [zoneId]: without };
}
