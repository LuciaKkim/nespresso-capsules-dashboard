import { mapCapsuleDragBlockedRef } from "../lib/mapPointerSensor";

type Props = {
  onReorderStart: (clientY: number) => void;
  onReorderMove: (clientY: number) => void;
  onReorderEnd: () => void;
  onPointerActive: (active: boolean) => void;
};

function blockSelection() {
  window.getSelection()?.removeAllRanges();
}

export function MapStackReorderGrip({
  onReorderStart,
  onReorderMove,
  onReorderEnd,
  onPointerActive,
}: Props) {
  return (
    <div
      className="map-stack-reorder"
      data-stack-reorder=""
      role="slider"
      tabIndex={0}
      aria-label="Drag vertically to preview stack position"
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();
        mapCapsuleDragBlockedRef.current = true;
        blockSelection();
        onPointerActive(true);
        onReorderStart(e.clientY);
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
        e.stopPropagation();
        e.preventDefault();
        blockSelection();
        onReorderMove(e.clientY);
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        mapCapsuleDragBlockedRef.current = false;
        onReorderEnd();
        onPointerActive(false);
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      }}
      onPointerCancel={(e) => {
        e.stopPropagation();
        mapCapsuleDragBlockedRef.current = false;
        onReorderEnd();
        onPointerActive(false);
      }}
      onDragStart={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div className="map-stack-scroll-grip" aria-hidden>
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
