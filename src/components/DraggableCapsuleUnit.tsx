import { useDraggable } from "@dnd-kit/core";
import { memo } from "react";
import type { CapsuleProduct } from "../lib/types";
import { DRAG_UNIT, type DragUnitPayload } from "../lib/types";

type Props = {
  slotKey: string;
  zoneId: string;
  product: CapsuleProduct;
  selected: boolean;
  onToggle: (slotKey: string) => void;
  dragDisabled?: boolean;
};

export const DraggableCapsuleUnit = memo(function DraggableCapsuleUnit({
  slotKey,
  zoneId,
  product,
  selected,
  onToggle,
  dragDisabled = false,
}: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    disabled: dragDisabled,
    id: slotKey,
    data: {
      type: DRAG_UNIT,
      zoneId,
      productId: product.id,
      slotKey,
    } satisfies DragUnitPayload,
  });

  return (
    <span
      ref={setNodeRef}
      className={`capsule-unit capsule-unit--interactive${
        selected ? " capsule-unit--selected" : ""
      }${isDragging ? " dragging" : ""}`}
      {...listeners}
      {...attributes}
      aria-pressed={selected}
      onClick={(e) => {
        e.stopPropagation();
        onToggle(slotKey);
      }}
    >
      <span className="capsule-unit-figure">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt="" draggable={false} />
        ) : (
          <span className="capsule-unit-fallback" aria-hidden />
        )}
      </span>
    </span>
  );
});
