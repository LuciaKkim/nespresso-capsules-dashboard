import { memo } from "react";
import type { CapsuleProduct } from "../lib/types";
import { DraggableCapsuleUnit } from "./DraggableCapsuleUnit";

const SLEEVE_SIZE = 10;

type Props = {
  zoneId: string;
  product: CapsuleProduct;
  count: number;
  selectedKeys: Set<string>;
  onToggle: (slotKey: string) => void;
  interactive?: boolean;
  capsuleDragDisabled?: boolean;
};

export const MapEditableUnits = memo(function MapEditableUnits({
  zoneId,
  product,
  count,
  selectedKeys,
  onToggle,
  interactive = true,
  capsuleDragDisabled = false,
}: Props) {
  if (count <= 0) {
    return <p className="capsule-unit-empty">Empty</p>;
  }

  const sleeves: number[] = [];
  for (let i = 0; i < count; i += SLEEVE_SIZE) {
    sleeves.push(Math.min(SLEEVE_SIZE, count - i));
  }

  let capsuleOffset = 0;

  return (
    <div className="capsule-sleeves map-editable-sleeves">
      {sleeves.map((filled, row) => {
        const rowStart = capsuleOffset;
        capsuleOffset += filled;
        return (
          <div key={row} className="capsule-sleeve-row">
            {Array.from({ length: SLEEVE_SIZE }, (_, i) => {
              if (i >= filled) {
                return (
                  <span key={i} className="capsule-unit capsule-unit--empty" />
                );
              }
              const slotKey = `${zoneId}:${product.id}:${rowStart + i}`;
              if (!interactive) {
                return (
                  <span
                    key={slotKey}
                    className="capsule-unit capsule-unit--preview"
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
              }
              return (
                <DraggableCapsuleUnit
                  key={slotKey}
                  slotKey={slotKey}
                  zoneId={zoneId}
                  product={product}
                  selected={selectedKeys.has(slotKey)}
                  onToggle={onToggle}
                  dragDisabled={capsuleDragDisabled}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
});
