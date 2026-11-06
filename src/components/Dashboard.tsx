import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useEffect, useMemo, useState } from "react";
import {
  filterProducts,
  loadCatalog,
  productMap,
} from "../lib/catalog";
import {
  defaultState,
  moveStack,
  upsertEntry,
  zoneUsage,
} from "../lib/storage";
import { useDashboardState } from "../lib/useDashboardState";
import { AppNav } from "./AppNav";
import type { CapsuleProduct, DragPayload, StorageZone } from "../lib/types";
import { DRAG_PRODUCT, DRAG_STACK } from "../lib/types";
import { CapsuleChip } from "./CapsuleChip";
import { StorageZoneCard } from "./StorageZoneCard";

function ZoneEditor({
  zone,
  onSave,
  onClose,
}: {
  zone: StorageZone;
  onSave: (z: StorageZone) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(zone);
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-labelledby="zone-edit-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="zone-edit-title">Storage zone</h2>
        <label>
          Name
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </label>
        <label>
          Location
          <input
            value={draft.location}
            onChange={(e) => setDraft({ ...draft, location: e.target.value })}
          />
        </label>
        <label>
          Max capsules
          <input
            type="number"
            min={1}
            value={draft.maxCapsules}
            onChange={(e) =>
              setDraft({ ...draft, maxCapsules: Number(e.target.value) || 1 })
            }
          />
        </label>
        <label>
          Note
          <input
            value={draft.note ?? ""}
            onChange={(e) => setDraft({ ...draft, note: e.target.value })}
          />
        </label>
        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => {
              onSave(draft);
              onClose();
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export function Dashboard() {
  const { state, setState } = useDashboardState();
  const [products, setProducts] = useState<CapsuleProduct[]>([]);
  const [catalogMeta, setCatalogMeta] = useState<string>("");
  const [query, setQuery] = useState("");
  const [catalogOpen, setCatalogOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeProduct, setActiveProduct] = useState<CapsuleProduct | null>(
    null,
  );
  const [editingZone, setEditingZone] = useState<StorageZone | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  useEffect(() => {
    loadCatalog()
      .then((file) => {
        setProducts(file.products);
        setCatalogMeta(file.syncedAt);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const productById = useMemo(() => productMap(products), [products]);
  const filtered = useMemo(
    () => filterProducts(products, query, "vertuo"),
    [products, query],
  );

  const totals = useMemo(() => {
    const totalCapsules = state.inventory.reduce((s, e) => s + e.count, 0);
    const byLine = { vertuo: 0, original: 0 };
    for (const e of state.inventory) {
      const p = productById.get(e.productId);
      if (p) byLine[p.line] += e.count;
    }
    return { totalCapsules, byLine };
  }, [state.inventory, productById]);

  function addZone() {
    const id = `zone-${crypto.randomUUID().slice(0, 8)}`;
    setState((s) => ({
      ...s,
      zones: [
        ...s.zones,
        {
          id,
          name: "New storage",
          location: "Unassigned",
          maxCapsules: 50,
        },
      ],
    }));
  }

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as DragPayload | undefined;
    if (!data) return;
    const productId =
      data.type === DRAG_PRODUCT ? data.productId : data.productId;
    setActiveProduct(productById.get(productId) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveProduct(null);
    const overId = event.over?.id;
    if (!overId || typeof overId !== "string") return;

    const data = event.active.data.current as DragPayload | undefined;
    if (!data) return;

    const zone = state.zones.find((z) => z.id === overId);
    if (!zone) return;

    if (data.type === DRAG_STACK) {
      setState((s) => ({
        ...s,
        inventory: moveStack(s.inventory, data.zoneId, zone.id, data.productId),
      }));
      return;
    }

    setState((s) => {
      const used = zoneUsage(zone.id, s.inventory);
      if (used + 1 > zone.maxCapsules) return s;
      return {
        ...s,
        inventory: upsertEntry(s.inventory, zone.id, data.productId, 1),
      };
    });
  }

  function resetInventory() {
    if (!confirm("Reset all storage data?")) return;
    setState(defaultState());
  }

  if (loading) return <p className="status">Loading catalog…</p>;
  if (error)
    return (
      <div className="status error">
        <p>{error}</p>
        <p>
          Run <code>npm run sync:catalog</code> in the project folder, then
          refresh.
        </p>
      </div>
    );

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={`layout ${catalogOpen ? "" : "layout--catalog-collapsed"}`}>
        <aside
          className={`sidebar ${catalogOpen ? "" : "sidebar--collapsed"}`}
          aria-label="Capsule catalog"
        >
          <button
            type="button"
            className="catalog-toggle"
            aria-expanded={catalogOpen}
            onClick={() => setCatalogOpen((open) => !open)}
          >
            <span className="catalog-toggle-text">
              <span className="type-label">Catalog</span>
              <span className="catalog-toggle-count">{filtered.length}</span>
            </span>
            <span className="catalog-chevron" aria-hidden />
          </button>

          <div
            className={`catalog-panel ${catalogOpen ? "catalog-panel--open" : ""}`}
            aria-hidden={!catalogOpen}
          >
            <p className="catalog-sync muted">
              <span className="type-label type-label--inline">Synced</span>{" "}
              {new Date(catalogMeta).toLocaleString("en-US")}
            </p>
            <div className="filters">
              <label className="field-label type-label" htmlFor="catalog-search">
                Search
              </label>
              <input
                id="catalog-search"
                placeholder="Find a capsule…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <p className="hint">
              <span className="type-label type-label--inline">Drag</span>{" "}
              <span className="hint-body">
                one capsule per drop, or move a full stack between zones.
              </span>
            </p>
            <div className="catalog-list">
              {filtered.map((p) => (
                <CapsuleChip key={p.id} product={p} />
              ))}
            </div>
          </div>
        </aside>

        <main className="main">
          <header className="topbar">
            <div>
              <h1>Capsule storage</h1>
              <p className="topbar-stats">
                <span>
                  <span className="type-label type-label--inline">Total</span>{" "}
                  <span className="stat-value">{totals.totalCapsules}</span>
                </span>
                <span className="stat-sep" aria-hidden>
                  ·
                </span>
                <span>
                  <span className="type-label type-label--inline">Vertuo</span>{" "}
                  <span className="stat-value">{totals.byLine.vertuo}</span>
                </span>
              </p>
            </div>
            <div className="topbar-actions">
              <AppNav />
              <button type="button" onClick={addZone}>
                Add zone
              </button>
              <button type="button" className="ghost" onClick={resetInventory}>
                Reset
              </button>
            </div>
          </header>

          <section className="zones-stack">
            {state.zones.map((zone) => (
              <StorageZoneCard
                key={zone.id}
                zone={zone}
                inventory={state.inventory}
                stackOrder={state.stackOrder}
                products={productById}
                onAdjust={(productId, delta) =>
                  setState((s) => ({
                    ...s,
                    inventory: upsertEntry(
                      s.inventory,
                      zone.id,
                      productId,
                      delta,
                    ),
                  }))
                }
                onEditZone={setEditingZone}
              />
            ))}
          </section>
        </main>
      </div>

      <DragOverlay>
        {activeProduct ? (
          <CapsuleChip product={activeProduct} draggable={false} />
        ) : null}
      </DragOverlay>

      {editingZone && (
        <ZoneEditor
          zone={editingZone}
          onClose={() => setEditingZone(null)}
          onSave={(z) =>
            setState((s) => ({
              ...s,
              zones: s.zones.map((x) => (x.id === z.id ? z : x)),
            }))
          }
        />
      )}
    </DndContext>
  );
}
