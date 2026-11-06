import type { ZoneLayout } from "./types";
import { MAP_CANVAS } from "./mapLayout";

export type ContentBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export function measureZoneNodesBounds(
  layout: ZoneLayout,
  nodes: NodeListOf<HTMLElement>,
): ContentBounds | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    const zoneId = node.dataset.zoneId;
    if (!zoneId) continue;
    const pos = layout[zoneId];
    if (!pos) continue;
    const w = node.offsetWidth;
    const h = node.offsetHeight;
    if (w <= 0 || h <= 0) continue;
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + w);
    maxY = Math.max(maxY, pos.y + h);
  }

  if (!Number.isFinite(minX)) return null;
  return { minX, minY, maxX, maxY };
}

export function canvasBounds(): ContentBounds {
  return { minX: 0, minY: 0, maxX: MAP_CANVAS.width, maxY: MAP_CANVAS.height };
}

export function viewTransformForBounds(
  bounds: ContentBounds,
  viewportWidth: number,
  viewportHeight: number,
  padding: number,
  minScale: number,
  maxScale: number,
): { scale: number; x: number; y: number } {
  const contentW = Math.max(bounds.maxX - bounds.minX, 1);
  const contentH = Math.max(bounds.maxY - bounds.minY, 1);
  const scale = Math.min(
    maxScale,
    Math.max(
      minScale,
      Math.min(
        (viewportWidth - padding * 2) / contentW,
        (viewportHeight - padding * 2) / contentH,
      ),
    ),
  );
  const cx = bounds.minX + contentW / 2;
  const cy = bounds.minY + contentH / 2;
  return {
    scale,
    x: viewportWidth / 2 - cx * scale,
    y: viewportHeight / 2 - cy * scale,
  };
}
