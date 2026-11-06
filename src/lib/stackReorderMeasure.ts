export type StackGhostRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export function measureStackReorderPreview(
  zoneId: string,
  productId: string,
  clientY: number,
): { sourceIndex: number; insertIndex: number; ghost: StackGhostRect } | null {
  const zone = document.querySelector(
    `[data-zone-id="${zoneId}"].map-zone-node`,
  );
  if (!zone) return null;

  const blocks = Array.from(
    zone.querySelectorAll<HTMLElement>(".map-stack-block"),
  );
  if (blocks.length === 0) return null;

  const sourceIndex = blocks.findIndex(
    (b) => b.dataset.stackProductId === productId,
  );
  if (sourceIndex < 0) return null;

  const rects = blocks.map((b) => b.getBoundingClientRect());
  const sourceRect = rects[sourceIndex];

  let insertIndex = 0;
  for (let i = 0; i < blocks.length; i++) {
    if (i === sourceIndex) continue;
    const r = rects[i];
    if (clientY > r.top + r.height * 0.68) insertIndex++;
  }
  insertIndex = Math.max(0, Math.min(blocks.length - 1, insertIndex));

  const withoutRects = rects.filter((_, i) => i !== sourceIndex);
  let ghostTop = sourceRect.top;
  if (withoutRects.length === 0) {
    ghostTop = sourceRect.top;
  } else if (insertIndex <= 0) {
    ghostTop = withoutRects[0].top;
  } else if (insertIndex >= withoutRects.length) {
    ghostTop = withoutRects[withoutRects.length - 1].bottom - sourceRect.height;
  } else {
    ghostTop = withoutRects[insertIndex].top;
  }

  return {
    sourceIndex,
    insertIndex,
    ghost: {
      top: ghostTop,
      left: sourceRect.left,
      width: sourceRect.width,
      height: sourceRect.height,
    },
  };
}
