import bundledCatalog from "../generated/catalog.json" with { type: "json" };
import type { CatalogFile } from "./types";

const BASE = "https://www.nespresso.com";

export async function loadCatalog(): Promise<CatalogFile> {
  if (typeof window !== "undefined" && window.location.protocol !== "file:") {
    try {
      const res = await fetch("/catalog.json", { cache: "no-store" });
      if (res.ok) return res.json() as Promise<CatalogFile>;
    } catch {
      /* bundled fallback */
    }
  }
  if (bundledCatalog?.products?.length) {
    return bundledCatalog as CatalogFile;
  }
  throw new Error(
    "Catalog is empty. Run npm run sync:catalog, then refresh.",
  );
}

export function productMap(products: CatalogFile["products"]) {
  return new Map(products.map((p) => [p.id, p]));
}

export function filterProducts(
  products: CatalogFile["products"],
  query: string,
  line: "vertuo" | "original" | "all",
) {
  const q = query.trim().toLowerCase();
  return products.filter((p) => {
    if (line !== "all" && p.line !== line) return false;
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.slug.toLowerCase().includes(q) ||
      p.legacyId.includes(q)
    );
  });
}

export function absNespressoUrl(pathOrUrl: string | null) {
  if (!pathOrUrl) return null;
  if (pathOrUrl.startsWith("http")) return pathOrUrl;
  return `${BASE}${pathOrUrl}`;
}
