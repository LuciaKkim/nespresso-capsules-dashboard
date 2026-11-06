export type CapsuleLine = "vertuo" | "original";

export type CapsuleMarket = "kr" | "us" | "ch" | "nl" | "qa" | "kw" | string;

export type CapsuleProduct = {
  id: string;
  legacyId: string;
  name: string;
  slug: string;
  market: CapsuleMarket;
  line: CapsuleLine;
  intensity: number | null;
  cupSizeLabel: string | null;
  cupSizeMl: string | null;
  packageSize: number;
  price: number | null;
  imageUrl: string | null;
  orderUrl: string | null;
  syncedAt: string;
};

export type CatalogFile = {
  market: string;
  language: string;
  syncedAt: string;
  products: CapsuleProduct[];
};

export type StorageZone = {
  id: string;
  name: string;
  location: string;
  maxCapsules: number;
  note?: string;
};

export type InventoryEntry = {
  zoneId: string;
  productId: string;
  count: number;
};

export const DRAG_PRODUCT = "nespresso/product";
export const DRAG_STACK = "nespresso/stack";
export const DRAG_UNIT = "nespresso/unit";

export type DragProductPayload = {
  type: typeof DRAG_PRODUCT;
  productId: string;
};

export type DragStackPayload = {
  type: typeof DRAG_STACK;
  zoneId: string;
  productId: string;
};

export type DragUnitPayload = {
  type: typeof DRAG_UNIT;
  zoneId: string;
  productId: string;
  slotKey: string;
};

export type DragPayload =
  | DragProductPayload
  | DragStackPayload
  | DragUnitPayload;

/** Canvas positions for the storage map editor (persisted). */
export type ZoneLayout = Record<string, { x: number; y: number }>;

export type StackOrderMap = Record<string, string[]>;

export type DashboardState = {
  zones: StorageZone[];
  inventory: InventoryEntry[];
  zoneLayout?: ZoneLayout;
  /** Per-zone display order of product stacks (product ids). */
  stackOrder?: StackOrderMap;
};
