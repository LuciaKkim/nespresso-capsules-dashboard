import type { DragEndEvent } from "@dnd-kit/core";
import { getEventCoordinates } from "@dnd-kit/utilities";
import type { StorageZone } from "./types";
import { DRAG_UNIT, type DragUnitPayload } from "./types";

export function pointerFromDragEnd(event: DragEndEvent): { x: number; y: number } | null {
  const start = getEventCoordinates(event.activatorEvent);
  if (!start) return null;
  return { x: start.x + event.delta.x, y: start.y + event.delta.y };
}

export function zoneIdAtPoint(x: number, y: number): string | null {
  for (const el of document.elementsFromPoint(x, y)) {
    if (!(el instanceof HTMLElement)) continue;
    const zone = el.closest("[data-zone-id]");
    if (zone instanceof HTMLElement && zone.dataset.zoneId) {
      return zone.dataset.zoneId;
    }
  }
  return null;
}

export function resolveDropZoneId(
  event: DragEndEvent,
  zones: StorageZone[],
): string | null {
  const zoneIds = new Set(zones.map((z) => z.id));

  if (event.over) {
    const overId = String(event.over.id);
    if (zoneIds.has(overId)) return overId;

    const unit = event.over.data.current as DragUnitPayload | undefined;
    if (unit?.type === DRAG_UNIT && zoneIds.has(unit.zoneId)) {
      return unit.zoneId;
    }
  }

  const pt = pointerFromDragEnd(event);
  if (pt) {
    const hit = zoneIdAtPoint(pt.x, pt.y);
    if (hit && zoneIds.has(hit)) return hit;
  }

  return null;
}

export function resolveHoverZoneId(
  over: DragEndEvent["over"],
  zones: StorageZone[],
): string | null {
  if (!over) return null;
  const zoneIds = new Set(zones.map((z) => z.id));
  const overId = String(over.id);
  if (zoneIds.has(overId)) return overId;
  const unit = over.data.current as DragUnitPayload | undefined;
  if (unit?.type === DRAG_UNIT && zoneIds.has(unit.zoneId)) {
    return unit.zoneId;
  }
  return null;
}
