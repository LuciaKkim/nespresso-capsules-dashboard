import type { DashboardState, InventoryEntry, StorageZone } from "./types";
import seedDashboard from "../seed/dashboard.json";

export const STORAGE_KEY = "nespresso-dashboard-v2-en";
const KEY = STORAGE_KEY;

function normalizeState(parsed: DashboardState): DashboardState {
  if (!parsed.zones?.length) parsed.zones = DEFAULT_ZONES;
  parsed.inventory = parsed.inventory ?? [];
  parsed.stackOrder = parsed.stackOrder ?? {};
  return parsed;
}

export const DEFAULT_ZONES: StorageZone[] = [
  {
    id: "machine",
    name: "Machine dispenser",
    location: "Kitchen",
    maxCapsules: 20,
    note: "Daily rotation",
  },
  {
    id: "drawer",
    name: "Capsule drawer",
    location: "Kitchen",
    maxCapsules: 100,
  },
  {
    id: "office",
    name: "Office stash",
    location: "Office",
    maxCapsules: 60,
  },
];

export function defaultState(): DashboardState {
  return { zones: DEFAULT_ZONES, inventory: [] };
}

export function loadState(): DashboardState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const seeded = normalizeState(structuredClone(seedDashboard) as DashboardState);
      saveState(seeded);
      return seeded;
    }
    return normalizeState(JSON.parse(raw) as DashboardState);
  } catch {
    return defaultState();
  }
}

export function saveState(state: DashboardState) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

/** Wipe saved inventory/layout and start from empty zones. */
export function clearSavedState() {
  const empty = defaultState();
  saveState(empty);
  return empty;
}

/** Replace local data with the bundled deploy seed (demo snapshot). */
export function restoreSeedState() {
  const seeded = normalizeState(structuredClone(seedDashboard) as DashboardState);
  saveState(seeded);
  return seeded;
}

export function zoneUsage(
  zoneId: string,
  inventory: InventoryEntry[],
): number {
  return inventory
    .filter((e) => e.zoneId === zoneId)
    .reduce((sum, e) => sum + e.count, 0);
}

export function getEntry(
  inventory: InventoryEntry[],
  zoneId: string,
  productId: string,
): InventoryEntry | undefined {
  return inventory.find(
    (e) => e.zoneId === zoneId && e.productId === productId,
  );
}

export function upsertEntry(
  inventory: InventoryEntry[],
  zoneId: string,
  productId: string,
  delta: number,
): InventoryEntry[] {
  const next = inventory.map((e) => ({ ...e }));
  const idx = next.findIndex(
    (e) => e.zoneId === zoneId && e.productId === productId,
  );
  if (idx === -1) {
    if (delta <= 0) return next;
    next.push({ zoneId, productId, count: delta });
    return next.filter((e) => e.count > 0);
  }
  next[idx] = { ...next[idx], count: next[idx].count + delta };
  return next.filter((e) => e.count > 0);
}

export function moveStack(
  inventory: InventoryEntry[],
  fromZoneId: string,
  toZoneId: string,
  productId: string,
): InventoryEntry[] {
  if (fromZoneId === toZoneId) return inventory;
  const from = getEntry(inventory, fromZoneId, productId);
  if (!from?.count) return inventory;
  let next = upsertEntry(inventory, fromZoneId, productId, -from.count);
  next = upsertEntry(next, toZoneId, productId, from.count);
  return next;
}

export function moveOneCapsule(
  inventory: InventoryEntry[],
  zones: StorageZone[],
  fromZoneId: string,
  toZoneId: string,
  productId: string,
): InventoryEntry[] {
  if (fromZoneId === toZoneId) return inventory;
  const from = getEntry(inventory, fromZoneId, productId);
  if (!from?.count) return inventory;
  const zone = zones.find((z) => z.id === toZoneId);
  if (!zone) return inventory;
  const used = zoneUsage(toZoneId, inventory);
  if (used >= zone.maxCapsules) return inventory;
  let next = upsertEntry(inventory, fromZoneId, productId, -1);
  next = upsertEntry(next, toZoneId, productId, 1);
  return next;
}
