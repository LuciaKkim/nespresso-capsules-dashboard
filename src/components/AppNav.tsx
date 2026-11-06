import { useSyncExternalStore } from "react";
import { appPath, navigate } from "../lib/nav";

function subscribeNav(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);
  return () => window.removeEventListener("popstate", onStoreChange);
}

export function AppNav() {
  const path = useSyncExternalStore(subscribeNav, appPath, () => "/" as const);

  return (
    <nav className="app-nav" aria-label="Primary">
      <button
        type="button"
        className={path === "/" ? "app-nav-link active" : "app-nav-link"}
        onClick={() => navigate("/")}
      >
        Storage
      </button>
      <button
        type="button"
        className={path === "/edit" ? "app-nav-link active" : "app-nav-link"}
        onClick={() => navigate("/edit")}
      >
        Map edit
      </button>
      <button
        type="button"
        className={path === "/guide" ? "app-nav-link active" : "app-nav-link"}
        onClick={() => navigate("/guide")}
      >
        Guide
      </button>
    </nav>
  );
}
