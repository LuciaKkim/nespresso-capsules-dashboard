import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { CapsuleProduct, InventoryEntry, StorageZone } from "../lib/types";
import { DRAG_STACK, type DragStackPayload } from "../lib/types";
import { sortZoneEntries } from "../lib/stackOrder";
import type { StackOrderMap } from "../lib/types";
import { zoneUsage } from "../lib/storage";
import { CapsuleUnitIcons } from "./CapsuleUnitIcons";

function StackItem({
  zoneId,
  product,
  count,
  onAdjust,
  maxZoneCapsules,
  zoneUsed,
}: {
  zoneId: string;
  product: CapsuleProduct;
  count: number;
  onAdjust: (delta: number) => void;
  maxZoneCapsules: number;
  zoneUsed: number;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `stack-${zoneId}-${product.id}`,
    data: {
      type: DRAG_STACK,
      zoneId,
      productId: product.id,
    } satisfies DragStackPayload,
  });

  const atMax = zoneUsed >= maxZoneCapsules;

  return (
    <article className={`product-inventory-card ${isDragging ? "dragging" : ""}`}>
      <div
        ref={setNodeRef}
        className="product-inventory-head"
        {...listeners}
        {...attributes}
      >
        <div className="product-hero">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt="" />
          ) : (
            <span className="product-hero-fallback">
              {product.line === "vertuo" ? "V" : "O"}
            </span>
          )}
        </div>
        <div className="product-copy">
          <h3>{product.name}</h3>
          <p className="product-spec-line">
            {product.cupSizeLabel ? (
              <>
                <span className="type-label type-label--inline">Cup size</span>{" "}
                <span className="spec-accent">{product.cupSizeLabel}</span>
              </>
            ) : (
              <span className="type-label type-label--inline">Vertuo</span>
            )}
          </p>
          <span className="drag-hint">Drag card to move zone</span>
        </div>
      </div>

      <div className="quantity-counter">
        <button
          type="button"
          className="counter-btn"
          aria-label="Remove one capsule"
          disabled={count <= 0}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onAdjust(-1)}
        >
          −
        </button>

        <div className="quantity-counter-body">
          <CapsuleUnitIcons product={product} count={count} />
        </div>

        <button
          type="button"
          className="counter-btn"
          aria-label="Add one capsule"
          disabled={atMax}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onAdjust(1)}
        >
          +
        </button>
      </div>
    </article>
  );
}

type Props = {
  zone: StorageZone;
  inventory: InventoryEntry[];
  products: Map<string, CapsuleProduct>;
  stackOrder?: StackOrderMap;
  onAdjust: (productId: string, delta: number) => void;
  onEditZone: (zone: StorageZone) => void;
};

export function StorageZoneCard({
  zone,
  inventory,
  products,
  stackOrder,
  onAdjust,
  onEditZone,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: zone.id });
  const used = zoneUsage(zone.id, inventory);
  const pct = zone.maxCapsules > 0 ? Math.min(100, (used / zone.maxCapsules) * 100) : 0;

  const entries = sortZoneEntries(
    zone.id,
    inventory.filter((e) => e.zoneId === zone.id && e.count > 0),
    stackOrder,
  );

  return (
    <section
      ref={setNodeRef}
      className={`zone-panel ${isOver ? "drop-over" : ""}`}
    >
      <header className="zone-panel-header">
        <div>
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
        </div>
        <button type="button" className="ghost" onClick={() => onEditZone(zone)}>
          Edit
        </button>
      </header>

      <div
        className="capacity-bar capacity-bar-slim"
        aria-label={`Storage ${Math.round(pct)} percent full`}
      >
        <div className="capacity-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="zone-products">
        {entries.length === 0 && (
          <p className="zone-empty">Drop capsules from the catalog</p>
        )}
        {entries.map((entry) => {
          const product = products.get(entry.productId);
          if (!product) return null;
          return (
            <StackItem
              key={entry.productId}
              zoneId={zone.id}
              product={product}
              count={entry.count}
              maxZoneCapsules={zone.maxCapsules}
              zoneUsed={used}
              onAdjust={(delta) => onAdjust(entry.productId, delta)}
            />
          );
        })}
      </div>
    </section>
  );
}
