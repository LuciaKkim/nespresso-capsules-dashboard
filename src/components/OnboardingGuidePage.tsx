import { clearSavedState, restoreSeedState } from "../lib/storage";
import { AppNav } from "./AppNav";

export function OnboardingGuidePage() {
  function reloadAfter(fn: () => void) {
    fn();
    window.location.href = "/";
  }

  return (
    <div className="guide-page">
      <header className="guide-header">
        <div>
          <h1>Quick guide</h1>
          <p className="hint guide-lead">
            Vertuo capsule inventory lives in this browser. Your first visit loads
            the bundled snapshot; after that, changes stay in local storage.
          </p>
        </div>
        <AppNav />
      </header>

      <ol className="guide-steps">
        <li>
          <span className="type-label type-label--inline">Storage</span> — drag
          capsules from the catalog into zones, adjust counts with +/−, drag a
          card to move a whole stack.
        </li>
        <li>
          <span className="type-label type-label--inline">Map edit</span> — pan
          empty canvas, zoom with scroll, drag zone headers to reposition. Click
          capsules to select; drag one to another zone. Use ≡ on the right to
          preview stack order, then release to place.
        </li>
        <li>
          <span className="type-label type-label--inline">Catalog</span> — run{" "}
          <code>npm run sync:catalog</code> locally to refresh{" "}
          <code>public/catalog.json</code> before redeploying.
        </li>
      </ol>

      <section className="guide-actions" aria-label="Data controls">
        <button
          type="button"
          className="danger-btn"
          onClick={() => {
            if (
              window.confirm(
                "Clear all zones, inventory, map layout, and stack order in this browser?",
              )
            ) {
              reloadAfter(clearSavedState);
            }
          }}
        >
          Clear
        </button>
        <button
          type="button"
          className="ghost"
          onClick={() => {
            if (
              window.confirm(
                "Restore the bundled demo snapshot (overwrites current local data)?",
              )
            ) {
              reloadAfter(restoreSeedState);
            }
          }}
        >
          Restore demo data
        </button>
      </section>
    </div>
  );
}
