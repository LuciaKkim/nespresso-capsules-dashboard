import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { resolveDropZoneId, resolveHoverZoneId } from "../lib/mapDrop";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { mapCapsuleDragBlockedRef } from "../lib/mapPointerSensor";
import { loadCatalog, productMap } from "../lib/catalog";
import {
  canvasBounds,
  measureZoneNodesBounds,
  viewTransformForBounds,
} from "../lib/mapFit";
import { MAP_CANVAS, resolveZoneLayout } from "../lib/mapLayout";
import { measureStackReorderPreview } from "../lib/stackReorderMeasure";
import { moveStackToIndex, sortZoneEntries } from "../lib/stackOrder";
import { moveOneCapsule } from "../lib/storage";
import { useDashboardState } from "../lib/useDashboardState";
import type { CapsuleProduct, DragUnitPayload, ZoneLayout } from "../lib/types";
import { DRAG_UNIT } from "../lib/types";
import { AppNav } from "./AppNav";
import { MapStackReorderGhost } from "./MapStackReorderGhost";
import { MapZoneNode } from "./MapZoneNode";

type StackReorderSession = {
  zoneId: string;
  productId: string;
  insertIndex: number;
  ghost: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
};

function briefMl(product: CapsuleProduct): string | null {
  const ml = product.cupSizeMl?.trim();
  if (ml && /^\d+$/.test(ml)) return `${ml}ml`;
  const fromLabel = product.cupSizeLabel?.match(/\((\d+)\s*ml\)/i)?.[1];
  return fromLabel ? `${fromLabel}ml` : null;
}

type ViewTransform = { x: number; y: number; scale: number };

const MIN_SCALE = 0.35;
const MAX_SCALE = 1.75;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function StorageMapPage() {
  const { state, patchState } = useDashboardState();
  const [products, setProducts] = useState<CapsuleProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const [activeUnit, setActiveUnit] = useState<{
    product: CapsuleProduct;
  } | null>(null);
  const [hoverDropZoneId, setHoverDropZoneId] = useState<string | null>(null);
  const [view, setView] = useState<ViewTransform>({ x: 48, y: 32, scale: 0.72 });
  const [layoutLive, setLayoutLive] = useState<ZoneLayout | null>(null);
  const [stackReorderActive, setStackReorderActive] = useState(false);
  const [reorderSession, setReorderSession] =
    useState<StackReorderSession | null>(null);
  const reorderSessionRef = useRef<StackReorderSession | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);
  const transformLayerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef(view);
  viewRef.current = view;
  const panRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(
    null,
  );
  const zoneDragRef = useRef<{
    zoneId: string;
    px: number;
    py: number;
    ox: number;
    oy: number;
    baseLayout: ZoneLayout;
  } | null>(null);
  const layoutLiveRef = useRef<ZoneLayout | null>(null);
  const frameRef = useRef(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const setStackReorderActiveSync = useCallback((active: boolean) => {
    mapCapsuleDragBlockedRef.current = active;
    flushSync(() => setStackReorderActive(active));
  }, []);

  useEffect(() => {
    loadCatalog()
      .then((file) => {
        setProducts(file.products);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const capsuleDragLocked = Boolean(reorderSession);

  useEffect(() => {
    const preventSelect = (e: Event) => {
      if (!mapCapsuleDragBlockedRef.current && !reorderSessionRef.current) return;
      e.preventDefault();
    };
    document.addEventListener("selectstart", preventSelect);
    return () => document.removeEventListener("selectstart", preventSelect);
  }, []);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = document.documentElement.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overflow = prevOverflow;
      document.documentElement.style.overscrollBehavior = prevOverscroll;
    };
  }, []);

  const productById = useMemo(() => productMap(products), [products]);
  const layout = useMemo(
    () => resolveZoneLayout(state.zones, state.zoneLayout),
    [state.zones, state.zoneLayout],
  );
  const displayLayout = layoutLive ?? layout;
  const displayLayoutRef = useRef(displayLayout);
  displayLayoutRef.current = displayLayout;

  const zonePanels = useMemo(() => {
    return state.zones.map((zone) => {
      const entries = sortZoneEntries(
        zone.id,
        state.inventory.filter((e) => e.zoneId === zone.id && e.count > 0),
        state.stackOrder,
      );
      const used = entries.reduce((sum, e) => sum + e.count, 0);
      const selected = new Set<string>();
      for (const key of selectedKeys) {
        if (key.startsWith(`${zone.id}:`)) selected.add(key);
      }
      return { zone, entries, used, selected };
    });
  }, [state.zones, state.inventory, state.stackOrder, selectedKeys]);

  const toggleUnit = useCallback((slotKey: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(slotKey)) next.delete(slotKey);
      else next.add(slotKey);
      return next;
    });
  }, []);

  const commitReorderSession = useCallback(() => {
    const session = reorderSessionRef.current;
    reorderSessionRef.current = null;
    setReorderSession(null);
    mapCapsuleDragBlockedRef.current = false;
    setStackReorderActive(false);
    if (!session) return;

    patchState((s) => {
      const productIds = s.inventory
        .filter((entry) => entry.zoneId === session.zoneId && entry.count > 0)
        .map((entry) => entry.productId);
      return {
        ...s,
        stackOrder: moveStackToIndex(
          s.stackOrder,
          session.zoneId,
          session.productId,
          session.insertIndex,
          productIds,
        ),
      };
    });
  }, [patchState]);

  const onStackReorderStart = useCallback(
    (
      zoneId: string,
      productId: string,
      _sourceIndex: number,
      clientY: number,
    ) => {
      const measured = measureStackReorderPreview(zoneId, productId, clientY);
      if (!measured) return;
      const session: StackReorderSession = {
        zoneId,
        productId,
        insertIndex: measured.insertIndex,
        ghost: measured.ghost,
      };
      reorderSessionRef.current = session;
      setReorderSession(session);
      setStackReorderActiveSync(true);
    },
    [setStackReorderActiveSync],
  );

  const onStackReorderMove = useCallback((clientY: number) => {
    const session = reorderSessionRef.current;
    if (!session) return;
    const measured = measureStackReorderPreview(
      session.zoneId,
      session.productId,
      clientY,
    );
    if (!measured) return;
    const next: StackReorderSession = {
      ...session,
      insertIndex: measured.insertIndex,
      ghost: measured.ghost,
    };
    reorderSessionRef.current = next;
    setReorderSession(next);
  }, []);

  const onStackReorderEnd = useCallback(() => {
    commitReorderSession();
  }, [commitReorderSession]);

  const applyTransform = useCallback((v: ViewTransform) => {
    const el = transformLayerRef.current;
    if (el) {
      el.style.transform = `translate3d(${v.x}px, ${v.y}px, 0) scale(${v.scale})`;
    }
  }, []);

  const applyView = useCallback(
    (next: ViewTransform) => {
      viewRef.current = next;
      applyTransform(next);
      setView(next);
    },
    [applyTransform],
  );

  const fitView = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || state.zones.length === 0) return;

    const nodes =
      transformLayerRef.current?.querySelectorAll<HTMLElement>(".map-zone-node");
    const bounds =
      nodes && nodes.length > 0
        ? measureZoneNodesBounds(displayLayoutRef.current, nodes)
        : null;

    const next = viewTransformForBounds(
      bounds ?? canvasBounds(),
      viewport.clientWidth,
      viewport.clientHeight,
      56,
      MIN_SCALE,
      MAX_SCALE,
    );
    applyView(next);
  }, [state.zones.length, applyView]);

  useEffect(() => {
    if (loading) return;
    const id = requestAnimationFrame(() => fitView());
    return () => cancelAnimationFrame(id);
  }, [fitView, loading, state.zoneLayout, state.zones.length]);

  useEffect(() => {
    applyTransform(view);
  }, [view, applyTransform]);

  useEffect(() => {
    const scheduleFrame = (fn: () => void) => {
      if (frameRef.current) return;
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = 0;
        fn();
      });
    };

    const onMove = (e: PointerEvent) => {
      if (zoneDragRef.current) {
        const z = zoneDragRef.current;
        const scale = viewRef.current.scale;
        const dx = (e.clientX - z.px) / scale;
        const dy = (e.clientY - z.py) / scale;
        const next = {
          ...z.baseLayout,
          [z.zoneId]: { x: z.ox + dx, y: z.oy + dy },
        };
        layoutLiveRef.current = next;
        scheduleFrame(() => setLayoutLive(layoutLiveRef.current));
        return;
      }
      if (!panRef.current) return;
      const dx = e.clientX - panRef.current.x;
      const dy = e.clientY - panRef.current.y;
      const next = {
        ...viewRef.current,
        x: panRef.current.vx + dx,
        y: panRef.current.vy + dy,
      };
      viewRef.current = next;
      applyTransform(next);
    };

    const onUp = () => {
      if (zoneDragRef.current && layoutLiveRef.current) {
        const finalLayout = layoutLiveRef.current;
        patchState((s) => ({ ...s, zoneLayout: finalLayout }));
      }
      if (panRef.current) {
        setView({ ...viewRef.current });
      }
      panRef.current = null;
      zoneDragRef.current = null;
      layoutLiveRef.current = null;
      setLayoutLive(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [applyTransform, patchState]);

  const onViewportPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.button !== 1) return;
    const target = e.target as HTMLElement;
    if (target.closest(".map-zone-node")) return;
    panRef.current = {
      x: e.clientX,
      y: e.clientY,
      vx: view.x,
      vy: view.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onZoneHeadPointerDown = (zoneId: string, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const pos = displayLayout[zoneId];
    if (!pos) return;
    zoneDragRef.current = {
      zoneId,
      px: e.clientX,
      py: e.clientY,
      ox: pos.x,
      oy: pos.y,
      baseLayout: { ...displayLayout },
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const zoomAtPointer = useCallback(
    (clientX: number, clientY: number, deltaY: number) => {
      const el = viewportRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const mx = clientX - rect.left;
      const my = clientY - rect.top;
      const factor = deltaY > 0 ? 0.92 : 1.08;
      setView((v) => {
        const nextScale = clamp(v.scale * factor, MIN_SCALE, MAX_SCALE);
        const wx = (mx - v.x) / v.scale;
        const wy = (my - v.y) / v.scale;
        const next = {
          scale: nextScale,
          x: mx - wx * nextScale,
          y: my - wy * nextScale,
        };
        viewRef.current = next;
        applyTransform(next);
        return next;
      });
    },
    [applyTransform],
  );

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;

      if (target.closest("[data-stack-reorder]")) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (target.closest(".map-zone-node")) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      zoomAtPointer(e.clientX, e.clientY, e.deltaY);
    };
    el.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => el.removeEventListener("wheel", onWheel, { capture: true });
  }, [zoomAtPointer, loading]);

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as DragUnitPayload | undefined;
    if (data?.type !== DRAG_UNIT) return;
    const product = productById.get(data.productId);
    if (product) setActiveUnit({ product });
  }

  function handleDragOver(event: DragOverEvent) {
    setHoverDropZoneId(resolveHoverZoneId(event.over, state.zones));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveUnit(null);
    setHoverDropZoneId(null);
    const data = event.active.data.current as DragUnitPayload | undefined;
    if (!data || data.type !== DRAG_UNIT) return;

    const toZoneId = resolveDropZoneId(event, state.zones);
    if (!toZoneId) return;

    patchState((s) => ({
      ...s,
      inventory: moveOneCapsule(
        s.inventory,
        s.zones,
        data.zoneId,
        toZoneId,
        data.productId,
      ),
    }));
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      next.delete(data.slotKey);
      return next;
    });
  }

  function handleDragCancel() {
    setActiveUnit(null);
    setHoverDropZoneId(null);
  }

  if (loading) return <p className="status">Loading map…</p>;

  return (
    <DndContext
      sensors={stackReorderActive || reorderSession ? [] : sensors}
      collisionDetection={pointerWithin}
      autoScroll={false}
      measuring={{
        droppable: { strategy: MeasuringStrategy.Always },
      }}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="storage-map-page">
        <header className="map-page-header">
          <div>
            <h1>Storage map</h1>
            <p className="hint map-page-hint">
              <span className="type-label type-label--inline">Pan</span>{" "}
              <span className="hint-body">empty canvas · </span>
              <span className="type-label type-label--inline">Zoom</span>{" "}
              <span className="hint-body">scroll empty canvas · </span>
              <span className="type-label type-label--inline">Move zone</span>{" "}
              <span className="hint-body">drag header · </span>
              <span className="type-label type-label--inline">Capsule</span>{" "}
              <span className="hint-body">click toggle, drag 1 · </span>
              <span className="type-label type-label--inline">Grip</span>{" "}
              <span className="hint-body">drag grip to preview, release to place</span>
            </p>
          </div>
          <div className="map-page-actions">
            <AppNav />
            <button type="button" className="ghost" onClick={fitView}>
              Fit all
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => setSelectedKeys(new Set())}
              disabled={selectedKeys.size === 0}
            >
              Clear selection ({selectedKeys.size})
            </button>
          </div>
        </header>

        <div className="map-toolbar" aria-label="Zoom">
          <button
            type="button"
            className="ghost map-zoom-btn"
            onClick={() =>
              setView((v) => ({ ...v, scale: clamp(v.scale * 1.12, MIN_SCALE, MAX_SCALE) }))
            }
          >
            +
          </button>
          <span className="map-zoom-label">{Math.round(view.scale * 100)}%</span>
          <button
            type="button"
            className="ghost map-zoom-btn"
            onClick={() =>
              setView((v) => ({ ...v, scale: clamp(v.scale * 0.88, MIN_SCALE, MAX_SCALE) }))
            }
          >
            −
          </button>
        </div>

        <div
          ref={viewportRef}
          className="storage-map-viewport"
          onPointerDown={onViewportPointerDown}
        >
          <div ref={transformLayerRef} className="map-transform-layer">
            <div
              className="map-canvas"
              style={{
                width: MAP_CANVAS.width,
                height: MAP_CANVAS.height,
              }}
            >
              {zonePanels.map(({ zone, entries, used, selected }) => {
                const pos = displayLayout[zone.id];
                if (!pos) return null;
                return (
                  <MapZoneNode
                    key={zone.id}
                    zone={zone}
                    x={pos.x}
                    y={pos.y}
                    used={used}
                    entries={entries}
                    products={productById}
                    selectedKeys={selected}
                    dropHighlight={hoverDropZoneId === zone.id}
                    onToggleUnit={toggleUnit}
                    reorderSourceProductId={reorderSession?.productId ?? null}
                    capsuleDragDisabled={capsuleDragLocked}
                    stackReorderZoneActive={reorderSession?.zoneId === zone.id}
                    onStackReorderStart={onStackReorderStart}
                    onStackReorderMove={onStackReorderMove}
                    onStackReorderEnd={onStackReorderEnd}
                    onStackReorderActive={setStackReorderActiveSync}
                    onZonePointerDown={onZoneHeadPointerDown}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {reorderSession ? (() => {
        const product = productById.get(reorderSession.productId);
        if (!product) return null;
        const count =
          state.inventory.find(
            (e) =>
              e.zoneId === reorderSession.zoneId &&
              e.productId === reorderSession.productId,
          )?.count ?? 0;
        return (
          <MapStackReorderGhost
            product={product}
            zoneId={reorderSession.zoneId}
            count={count}
            ghost={reorderSession.ghost}
            mlLabel={briefMl(product)}
          />
        );
      })() : null}

      <DragOverlay>
        {activeUnit ? (
          <span className="capsule-unit capsule-unit--overlay">
            <span className="capsule-unit-figure">
              {activeUnit.product.imageUrl ? (
                <img src={activeUnit.product.imageUrl} alt="" />
              ) : (
                <span className="capsule-unit-fallback" aria-hidden />
              )}
            </span>
          </span>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
