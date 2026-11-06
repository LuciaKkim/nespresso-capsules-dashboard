import { useCallback, useEffect, useState } from "react";
import type { DashboardState } from "./types";
import { loadState, saveState, STORAGE_KEY } from "./storage";

export function useDashboardState() {
  const [state, setState] = useState<DashboardState>(() => loadState());

  useEffect(() => {
    const timer = window.setTimeout(() => saveState(state), 200);
    return () => window.clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    const flush = () => saveState(state);
    window.addEventListener("beforeunload", flush);
    return () => window.removeEventListener("beforeunload", flush);
  }, [state]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        setState(JSON.parse(event.newValue) as DashboardState);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const patchState = useCallback(
    (fn: (prev: DashboardState) => DashboardState) => setState(fn),
    [],
  );

  return { state, setState, patchState };
}
