import { useDraggable } from "@dnd-kit/core";
import type { CapsuleProduct } from "../lib/types";
import { DRAG_PRODUCT } from "../lib/types";

type Props = {
  product: CapsuleProduct;
  count?: number;
  draggable?: boolean;
  compact?: boolean;
};

export function CapsuleChip({
  product,
  count,
  draggable = true,
  compact = false,
}: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: count != null ? `stack-${product.id}-${count}` : `catalog-${product.id}`,
    disabled: !draggable,
    data: {
      type: DRAG_PRODUCT,
      productId: product.id,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`capsule-chip ${compact ? "compact" : ""} ${isDragging ? "dragging" : ""}`}
      {...listeners}
      {...attributes}
      title={product.name}
    >
      <div className="capsule-thumb">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt="" loading="lazy" />
        ) : (
          <span className="capsule-fallback">{product.line === "vertuo" ? "V" : "O"}</span>
        )}
      </div>
      <div className="capsule-meta">
        <strong className="capsule-name">{product.name}</strong>
        <span className="capsule-specs">
          {product.cupSizeLabel ? (
            <>
              <span className="type-label type-label--inline">Cup</span>{" "}
              <span className="spec-accent">{product.cupSizeLabel}</span>
            </>
          ) : null}
          {product.intensity != null && product.intensity > 0 ? (
            <>
              {product.cupSizeLabel ? (
                <span className="spec-sep" aria-hidden>
                  {" "}
                  ·{" "}
                </span>
              ) : null}
              <span className="type-label type-label--inline">Intensity</span>{" "}
              <span className="spec-accent">{product.intensity}</span>
            </>
          ) : null}
        </span>
      </div>
    </div>
  );
}
