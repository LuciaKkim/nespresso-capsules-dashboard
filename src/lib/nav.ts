export type AppRoute = "/" | "/edit" | "/guide";

export function appPath(): AppRoute {
  const p = window.location.pathname.replace(/\/$/, "") || "/";
  if (p === "/edit") return "/edit";
  if (p === "/guide") return "/guide";
  return "/";
}

export function navigate(path: AppRoute) {
  if (window.location.pathname !== path) {
    window.history.pushState({}, "", path);
  }
  window.dispatchEvent(new PopStateEvent("popstate"));
}
