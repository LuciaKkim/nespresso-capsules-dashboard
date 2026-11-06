import { createPortal } from "react-dom";
import type { CapsuleProduct } from "../lib/types";
import type { StackGhostRect } from "../lib/stackReorderMeasure";
import { MapEditableUnits } from "./MapEditableUnits";

type Props = {
  product: CapsuleProduct;
  zoneId: string;
  count: number;
  ghost: StackGhostRect;
  mlLabel: string | null;
};

export function MapStackReorderGhost({
  product,
  zoneId,
  count,
  ghost,
  mlLabel,
}: Props) {
  return createPortal(
    <div
      className="map-stack-reorder-ghost"
      style={{
        top: ghost.top,
        left: ghost.left,
        width: ghost.width,
        minHeight: ghost.height,
      }}
      aria-hidden
    >
      <div className="map-stack-reorder-ghost-inner">
        <div className="map-stack-main">
          <p className="map-stack-title">
            <span>{product.name}</span>
            {mlLabel ? (
              <span className="spec-accent map-stack-ml">{mlLabel}</span>
            ) : null}
          </p>
          <MapEditableUnits
            zoneId={zoneId}
            product={product}
            count={count}
            selectedKeys={new Set()}
            onToggle={() => {}}
            interactive={false}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
