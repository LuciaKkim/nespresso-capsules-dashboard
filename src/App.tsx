import { useSyncExternalStore } from "react";
import { Dashboard } from "./components/Dashboard";
import { OnboardingGuidePage } from "./components/OnboardingGuidePage";
import { StorageMapPage } from "./components/StorageMapPage";
import { appPath } from "./lib/nav";
import "./App.css";

function subscribeRoute(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);
  return () => window.removeEventListener("popstate", onStoreChange);
}

export default function App() {
  const path = useSyncExternalStore(subscribeRoute, appPath, () => "/" as const);

  return (
    <div className="app-shell">
      {path === "/edit" ? (
        <StorageMapPage />
      ) : path === "/guide" ? (
        <OnboardingGuidePage />
      ) : (
        <Dashboard />
      )}
    </div>
  );
}
