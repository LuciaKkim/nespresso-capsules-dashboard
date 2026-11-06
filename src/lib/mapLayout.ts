import type { StorageZone, ZoneLayout } from "./types";

const CANVAS = { width: 1400, height: 900 };
const CENTER = { x: CANVAS.width / 2, y: CANVAS.height / 2 };

/** Radial mind-map positions when nothing is saved yet. */
export function defaultZoneLayout(zones: StorageZone[]): ZoneLayout {
  const n = zones.length;
  if (n === 0) return {};
  const radius = n === 1 ? 0 : 220 + Math.min(n * 18, 120);
  const layout: ZoneLayout = {};
  zones.forEach((zone, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    layout[zone.id] = {
      x: CENTER.x + Math.cos(angle) * radius - 160,
      y: CENTER.y + Math.sin(angle) * radius - 120,
    };
  });
  return layout;
}

export function resolveZoneLayout(
  zones: StorageZone[],
  saved?: ZoneLayout,
): ZoneLayout {
  const base = defaultZoneLayout(zones);
  if (!saved) return base;
  const layout = { ...base };
  for (const zone of zones) {
    if (saved[zone.id]) layout[zone.id] = saved[zone.id];
  }
  return layout;
}

export const MAP_CANVAS = CANVAS;
