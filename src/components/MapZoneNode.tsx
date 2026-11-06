import { useDroppable } from "@dnd-kit/core";
import { memo } from "react";
import type { CapsuleProduct, InventoryEntry, StorageZone } from "../lib/types";
import { MapEditableUnits } from "./MapEditableUnits";
import { MapStackReorderGrip } from "./MapStackReorderGrip";

function briefMl(product: CapsuleProduct): string | null {
  const ml = product.cupSizeMl?.trim();
  if (ml && /^\d+$/.test(ml)) return `${ml}ml`;
  const fromLabel = product.cupSizeLabel?.match(/\((\d+)\s*ml\)/i)?.[1];
  return fromLabel ? `${fromLabel}ml` : null;
}

type Props = {
  zone: StorageZone;
  x: number;
  y: number;
  used: number;
  entries: InventoryEntry[];
  products: Map<string, CapsuleProduct>;
  selectedKeys: Set<string>;
  dropHighlight?: boolean;
  onToggleUnit: (slotKey: string) => void;
  reorderSourceProductId?: string | null;
  capsuleDragDisabled?: boolean;
  stackReorderZoneActive?: boolean;
  onStackReorderStart: (
    zoneId: string,
    productId: string,
    sourceIndex: number,
    clientY: number,
  ) => void;
  onStackReorderMove: (clientY: number) => void;
  onStackReorderEnd: () => void;
  onStackReorderActive: (active: boolean) => void;
  onZonePointerDown?: (zoneId: string, e: React.PointerEvent) => void;
};

export const MapZoneNode = memo(function MapZoneNode({
  zone,
  x,
  y,
  used,
  entries,
  products,
  selectedKeys,
  dropHighlight = false,
  onToggleUnit,
  reorderSourceProductId,
  capsuleDragDisabled = false,
  stackReorderZoneActive = false,
  onStackReorderStart,
  onStackReorderMove,
  onStackReorderEnd,
  onStackReorderActive,
  onZonePointerDown,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: zone.id,
    data: { zoneId: zone.id },
  });
  const pct =
    zone.maxCapsules > 0 ? Math.min(100, (used / zone.maxCapsules) * 100) : 0;

  return (
    <article
      ref={setNodeRef}
      data-zone-id={zone.id}
      className={`map-zone-node ${isOver || dropHighlight ? "map-zone-node--over" : ""}${
        dropHighlight ? " map-zone-node--drop-target" : ""
      }${stackReorderZoneActive ? " map-zone-node--stack-reordering" : ""}`}
      style={{
        transform: `translate3d(${x}px, ${y - (dropHighlight ? 4 : 0)}px, 0)`,
      }}
    >
      <header
        className="map-zone-node-head"
        onPointerDown={(e) => onZonePointerDown?.(zone.id, e)}
      >
        <h2>{zone.name}</h2>
        <p className="zone-panel-sub">
          <span className="type-label type-label--inline">{zone.location}</span>
          {zone.note ? (
            <>
              <span className="zone-sub-sep" aria-hidden>
                {" "}
                ·{" "}
              </span>
              <span className="zone-note">{zone.note}</span>
            </>
          ) : null}
        </p>
        <p className="map-zone-meta">
          <span className="type-label type-label--inline">Fill</span>{" "}
          <span className="spec-accent">
            {used}/{zone.maxCapsules}
          </span>
        </p>
      </header>
      <div
        className="capacity-bar capacity-bar-slim"
        aria-label={`Storage ${Math.round(pct)} percent full`}
      >
        <div className="capacity-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="map-zone-stacks">
        {entries.length === 0 ? (
          <p className="zone-empty">Drop a capsule here</p>
        ) : (
          entries.map((entry, index) => {
            const product = products.get(entry.productId);
            if (!product) return null;
            const ml = briefMl(product);
            return (
              <div
                key={entry.productId}
                className={`map-stack-block${
                  reorderSourceProductId === entry.productId
                    ? " map-stack-block--reorder-source"
                    : ""
                }`}
                data-zone-id={zone.id}
                data-stack-product-id={entry.productId}
              >
                <div className="map-stack-main">
                  <p className="map-stack-title">
                    <span>{product.name}</span>
                    {ml ? (
                      <span className="spec-accent map-stack-ml">{ml}</span>
                    ) : null}
                  </p>
                  <MapEditableUnits
                    zoneId={zone.id}
                    product={product}
                    count={entry.count}
                    selectedKeys={selectedKeys}
                    onToggle={onToggleUnit}
                    capsuleDragDisabled={
                      capsuleDragDisabled && stackReorderZoneActive
                    }
                  />
                </div>
                <MapStackReorderGrip
                  onReorderStart={(clientY) =>
                    onStackReorderStart(zone.id, entry.productId, index, clientY)
                  }
                  onReorderMove={onStackReorderMove}
                  onReorderEnd={onStackReorderEnd}
                  onPointerActive={onStackReorderActive}
                />
              </div>
            );
          })
        )}
      </div>
    </article>
  );
});
