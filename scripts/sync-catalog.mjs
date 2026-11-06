import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_PUBLIC = path.join(ROOT, "public", "catalog.json");
const OUT_BUNDLED = path.join(ROOT, "src", "generated", "catalog.json");

const BASE = "https://www.nespresso.com";
const MARKET = "kr";
const LANG = "en";

/** KR Vertuo PLP only — English storefront, no Original line. */
const LISTING_URLS = [
  { line: "vertuo", url: `${BASE}/${MARKET}/${LANG}/order/capsules/vertuo` },
];

/** Extra PDPs (international / Magento) merged into the catalog. */
const EXTRA_PDP_URLS = [
  `${BASE}/us/en/order/capsules/vertuo/samra-origins-tazania-vl`,
  `${BASE}/ch/en/order/capsules/vertuo/yuzu-vanilla-over-ice-vertuo-coffee-capsule`,
  `${BASE}/nl/en/order/capsules/vertuo/french-lavender-vanilla-decaf`,
  // Google 등에서 넘어오는 KW(Magento) PDP — SKU로 US ecapi 매칭
  `${BASE}/kw/en/coffee-capsules/vertuo/coconut-vanilla-flavour-over-ice-vl`,
  `${BASE}/qa/en/coffee-capsules/vertuo/cinnamon-apple-crisp`,
  `${BASE}/qa/en/coffee-capsules/vertuo/maple-pecan`,
  `${BASE}/qa/en/coffee-capsules/vertuo/pumpkin-spice-cake-vertuo`,
];

/** Slug → PDP to scrape a better capsule icon (Hybris / mobile storefront). */
const EXTRA_IMAGE_CRAWL = {
  "pumpkin-spice-cake-vertuo":
    `${BASE}/mobile/au/en/products/Capsule/Pumpkin-Spice-Cake/p/pumpkin-spice-cake-limited-edition-capsule`,
};

/** Bundled public assets — win over crawled URLs (see public/capsules/). Use square ~320×320 PLP PNGs only. */
const STATIC_IMAGE_OVERRIDES = {
  "pumpkin-spice-cake-vertuo": "/capsules/pumpkin-spice-cake-vertuo.png",
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function encodeProductId(id) {
  return Buffer.from(id, "utf8").toString("base64");
}

function extractProductIds(html) {
  const ids = new Set();
  for (const m of html.matchAll(/erp\.(?:kr|us|ch|nl)\.b2c\/prod\/[^"'\\]+/g)) {
    ids.add(m[0]);
  }
  return [...ids];
}

function extractPrimarySkuFromPdp(html) {
  const m = html.match(/"sku":"(erp\.[^"]+)"/);
  return m?.[1] ?? null;
}

function localeForProductId(id) {
  const code = id.match(/erp\.([a-z]{2})\./)?.[1];
  if (code === "us") return { market: "us", lang: "en" };
  if (code === "ch") return { market: "ch", lang: "en" };
  if (code === "nl") return { market: "nl", lang: "en" };
  if (code === "kr") return { market: "kr", lang: LANG };
  return { market: MARKET, lang: LANG };
}

const SET_SLUG_RE =
  /(?:^|[-_])(pack|selection|assortment|variety|starter|advent|sleeve|kit|bundle|set|aeroccino|swarovski|festive)(?:$|[-_])/i;

function isExcludedCapsule(product) {
  if (product.line !== "vertuo") return true;
  const hay = `${product.name} ${product.slug}`.toLowerCase();
  if (SET_SLUG_RE.test(product.slug) || SET_SLUG_RE.test(hay.replace(/\s+/g, "-"))) {
    return true;
  }
  const setWords =
    /\b(pack|selection|assortment|variety|starter|advent|sleeve|kit|bundle|set|aeroccino|swarovski|best.?selection|100.?pack)\b/i;
  return setWords.test(product.name) || setWords.test(product.slug);
}

function absImage(pathOrUrl) {
  if (!pathOrUrl) return null;
  if (pathOrUrl.startsWith("http")) return pathOrUrl;
  return `${BASE}${pathOrUrl}`;
}

function parsePackageFromIngredients(ingredients) {
  if (!Array.isArray(ingredients)) return null;
  for (let i = 0; i < ingredients.length; i++) {
    const label = ingredients[i]?.text?.toLowerCase() ?? "";
    const value = ingredients[i + 1]?.text ?? "";
    if (label.includes("내용량") || label.includes("net content")) {
      const m =
        value.match(/(\d+)\s*개입/) ||
        value.match(/(\d+)\s*(?:capsules|capsule|count|pcs)/i);
      if (m) return Number(m[1]);
    }
  }
  return null;
}

const CUP_NAME_DEFAULT_ML = {
  ristretto: "25",
  espresso: "40",
  "double espresso": "80",
  "gran lungo": "150",
  mug: "230",
  coffee: "230",
  "iced recipe": "230",
  "milk recipe": "230",
};

const CUP_OVERRIDES_BY_SLUG = {
  "pumpkin-spice-cake-vertuo": {
    cupSizeLabel: "Mug (230ml)",
    cupSizeMl: "230",
  },
};

function parseMlFromCup(cup) {
  if (!cup) return null;
  const fromCap = cup.capacityLabel?.match(/(\d+)\s*ml/i)?.[1];
  if (fromCap && !/^recipe$/i.test(fromCap)) return fromCap;
  const fromName = cup.name?.match(/\((\d+)\s*ml\)/i)?.[1];
  return fromName ?? null;
}

function pickBestCupDetail(details) {
  if (!Array.isArray(details) || details.length === 0) return null;
  for (const cup of details) {
    if (parseMlFromCup(cup)) return cup;
  }
  return details[0];
}

function formatCupLabel(label, ml) {
  if (!label) {
    return ml ? `Coffee (${ml}ml)` : null;
  }
  if (/\(\s*\d+\s*ml\s*\)/i.test(label)) return label.trim();
  const base = label.replace(/\s*\([^)]*\)\s*/g, "").trim();
  if (ml) return `${base} (${ml}ml)`;
  return label.trim();
}

function cupFieldsFromRaw(raw) {
  const cup = pickBestCupDetail(raw.capsuleCupSizesDetails);
  let cupSizeLabel = cup?.name ?? raw.capsuleCupSizes?.[0] ?? null;
  let cupSizeMl = parseMlFromCup(cup);
  if (!cupSizeMl && cupSizeLabel) {
    const key = cupSizeLabel.replace(/\([^)]*\)/, "").trim().toLowerCase();
    cupSizeMl = CUP_NAME_DEFAULT_ML[key] ?? null;
  }
  if (cupSizeMl === "Recipe" || !/^\d+$/.test(String(cupSizeMl ?? ""))) {
    cupSizeMl =
      parseMlFromCup(
        raw.capsuleCupSizesDetails?.find((c) => parseMlFromCup(c)),
      ) ?? cupSizeMl;
  }
  if (typeof cupSizeMl === "string" && !/^\d+$/.test(cupSizeMl)) {
    cupSizeMl = null;
  }
  cupSizeLabel = formatCupLabel(cupSizeLabel, cupSizeMl);
  return { cupSizeLabel, cupSizeMl: cupSizeMl ? String(cupSizeMl) : null };
}

function applyCupFields(product, fields) {
  if (fields.cupSizeLabel) product.cupSizeLabel = fields.cupSizeLabel;
  if (fields.cupSizeMl) product.cupSizeMl = fields.cupSizeMl;
}

async function enrichCupSizeFromOtherMarkets(product) {
  if (product.cupSizeMl && /^\d+$/.test(product.cupSizeMl)) {
    product.cupSizeLabel = formatCupLabel(
      product.cupSizeLabel,
      product.cupSizeMl,
    );
    return;
  }
  const base = product.legacyId?.match(/^(\d+)/)?.[1];
  if (!base) return;
  for (const market of ["kr", "us", "ch", "nl"]) {
    for (const suffix of [".60", ".10", ".20"]) {
      const id = `erp.${market}.b2c/prod/${base}${suffix}`;
      const json = await fetchProductRaw(id);
      if (!json?.capsuleCupSizesDetails?.length) continue;
      const fields = cupFieldsFromRaw(json);
      if (fields.cupSizeMl) {
        applyCupFields(product, fields);
        return;
      }
    }
  }
  if (!product.cupSizeMl && product.cupSizeLabel) {
    const key = product.cupSizeLabel.replace(/\([^)]*\)/, "").trim().toLowerCase();
    const ml = CUP_NAME_DEFAULT_ML[key];
    if (ml) {
      product.cupSizeMl = ml;
      product.cupSizeLabel = formatCupLabel(product.cupSizeLabel, ml);
    }
  }
}

function normalizeProduct(raw, catalogMarket, catalogLang) {
  if (!raw?.id || raw.modelType === "ResourceNotFoundError") return null;
  const line =
    raw.rootCategory === "capsules_vertuo"
      ? "vertuo"
      : raw.rootCategory === "capsules_original"
        ? "original"
        : null;
  if (!line || raw.type !== "capsule") return null;
  if (line !== "vertuo") return null;
  if (raw.bundled === true) return null;
  if (Array.isArray(raw.groupedProducts) && raw.groupedProducts.length > 0) {
    return null;
  }

  const { cupSizeLabel, cupSizeMl } = cupFieldsFromRaw(raw);
  const packageSize =
    parsePackageFromIngredients(raw.ingredients) ?? raw.salesMultiple ?? 10;
  const { market } = localeForProductId(raw.id);

  return {
    id: raw.id,
    legacyId: raw.legacyId,
    name: raw.name?.trim(),
    slug: raw.urlFriendlyName,
    market,
    line,
    intensity: raw.capsuleProperties?.intensity ?? null,
    cupSizeLabel,
    cupSizeMl,
    packageSize,
    price: raw.price ?? null,
    imageUrl:
      absImage(raw.responsiveImages?.plp) ??
      absImage(raw.images?.main) ??
      absImage(raw.images?.icon),
    orderUrl:
      raw.pdpURLs?.desktop ??
      `${BASE}/${MARKET}/${LANG}/order/capsules/${line}/${raw.urlFriendlyName}`,
    syncedAt: new Date().toISOString(),
  };
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function fetchProductRaw(id) {
  const { market, lang } = localeForProductId(id);
  const encoded = encodeProductId(id);
  const url = `${BASE}/ecapi/products/v2/${market}/b2c/${encoded}?language=${lang}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!res.ok) return null;
  return res.json();
}

async function fetchProduct(id) {
  const json = await fetchProductRaw(id);
  if (!json) return null;
  const { market, lang } = localeForProductId(id);
  return normalizeProduct(json, market, lang);
}

function isMagentoStoreUrl(url) {
  return /nespresso\.com\/[a-z]{2}\/en\/coffee-capsules\//.test(url);
}

function slugFromMagentoUrl(url) {
  return url.match(/coffee-capsules\/(?:vertuo|original)\/([^/?#]+)/)?.[1] ?? null;
}

async function resolveNumericMagentoSku(numericSku) {
  for (const suffix of [".10", ".20", ".60"]) {
    const id = `erp.us.b2c/prod/${numericSku}${suffix}`;
    const json = await fetchProductRaw(id);
    if (json?.id && json.type === "capsule" && !json.errorReason) return id;
  }
  return null;
}

/** kw/qa 등 Magento PDP → US ecapi erp ID */
async function resolveMagentoStoreProduct(url, html) {
  const numeric = html.match(/"sku":"(\d+)"/)?.[1];
  if (numeric) {
    const id = await resolveNumericMagentoSku(numeric);
    if (id) return id;
  }

  const slug = slugFromMagentoUrl(url);
  if (!slug) return null;

  const line = url.includes("/original/") ? "original" : "vertuo";
  const usCandidates = [
    `${BASE}/us/en/order/capsules/${line}/${slug}`,
    `${BASE}/us/en/order/capsules/${line}/${slug}-coffee-pod`,
    `${BASE}/us/en/order/capsules/${line}/${slug}-coffee-capsules`,
    `${BASE}/us/en/order/capsules/${line}/${slug}-flavored-capsule`,
    `${BASE}/us/en/order/capsules/${line}/${slug}-vertuo-coffee-pods`,
    `${BASE}/us/en/order/capsules/${line}/${slug}-coffee-pods`,
  ];

  for (const pdp of usCandidates) {
    try {
      const page = await fetchText(pdp);
      const erp = extractPrimarySkuFromPdp(page);
      if (erp) return erp;
    } catch {
      /* try next candidate */
    }
  }
  return null;
}

/** Magento-only capsules (no global ecapi match). */
function scrapeMagentoCapsule(pageUrl, html) {
  const slug = slugFromMagentoUrl(pageUrl);
  if (!slug) return null;

  const store = pageUrl.match(/nespresso\.com\/([a-z]{2})\//)?.[1] ?? "qa";
  const line = pageUrl.includes("/original/") ? "original" : "vertuo";

  let name =
    html.match(/data-product-name="([^"]+)"/)?.[1] ||
    html.match(/<span[^>]*class="base"[^>]*>([^<]+)<\/span>\s*<\/h1>/)?.[1];
  if (!name) {
    const og = html.match(/property="og:title" content="([^"]+)"/)?.[1];
    name = og
      ?.split("|")[0]
      ?.replace(/Vertuo Coffee Capsules.*/i, "")
      ?.replace(/Nespresso.*/i, "")
      ?.trim();
  }
  name = name?.replace(/\u200B/g, "").replace(/\s+/g, " ").trim();
  if (!name) return null;

  const imgPath = html.match(
    /media\/catalog\/product\/[^"'\s?]+\.(?:png|jpg|webp)/i,
  )?.[0];
  const imageUrl = imgPath
    ? `https://www.nespresso.com/${store}/en/${imgPath.split("?")[0]}`
    : null;

  const magentoSku = html.match(/"sku":"([^"]+)"/)?.[1] ?? slug;

  return {
    id: `magento.${store}/prod/${slug}`,
    legacyId: magentoSku,
    name,
    slug,
    market: store,
    line,
    intensity: null,
    cupSizeLabel: null,
    cupSizeMl: null,
    packageSize: 10,
    price: null,
    imageUrl,
    orderUrl: pageUrl,
    syncedAt: new Date().toISOString(),
  };
}

/** Hybris mobile / order PDP — capsule icon used in cart & PLP-style UI. */
function scrapeHybrisCapsuleImage(html, slug) {
  const slugAlt = slug.replace(/-vertuo$/, "");

  const productIcon = html.match(
    /\/ecom\/medias\/sys_master\/public\/\d+\.png\?impolicy=product/i,
  )?.[0];
  if (productIcon) {
    return absImage(productIcon.split("?")[0]);
  }

  for (const name of [slug, slugAlt]) {
    const slug2x = html.match(
      new RegExp(
        `/ecom/medias/sys_master/public/\\d+/${name}-2x\\.png`,
        "i",
      ),
    )?.[0];
    if (slug2x) return absImage(slug2x.split("?")[0]);
  }

  for (const suffix of ["_2025_2x", "_2025"]) {
    const agility = html.match(
      new RegExp(
        `shared_res/agility/global/coffees/vl/sku-main-info-product/${slugAlt}${suffix}\\.png`,
        "i",
      ),
    )?.[0];
    if (agility) return absImage(agility);
  }

  const ogImage = html.match(
    /property="og:image" content="(https:\/\/www\.nespresso\.com\/shared_res\/agility\/global\/coffees\/vl\/sku-main-info-product\/[^"]+)"/i,
  )?.[1];
  if (ogImage) return ogImage.split("&amp;")[0].split("?")[0];

  const mobileHero = html.match(
    /\/ecom\/medias\/sys_master\/public\/\d+\/mobile-C-\d+-main[^"'?\s]+\.jpg/i,
  )?.[0];
  if (mobileHero) {
    return absImage(mobileHero.split("?")[0]);
  }

  return null;
}

async function crawlCapsuleImage(slug, pageUrl) {
  const html = await fetchText(pageUrl);
  let image = scrapeHybrisCapsuleImage(html, slug);
  const preferOrderPdp =
    !image ||
    image.includes("sku-main-info-product") ||
    /\.jpg$/i.test(image);
  if (preferOrderPdp) {
    const orderUrl = html.match(/property="og:url" content="([^"]+)"/)?.[1];
    if (orderUrl && orderUrl !== pageUrl && orderUrl.includes("/order/capsules/")) {
      try {
        const orderHtml = await fetchText(orderUrl);
        const orderImage = scrapeHybrisCapsuleImage(orderHtml, slug);
        if (orderImage) image = orderImage;
      } catch {
        /* keep mobile scrape */
      }
    }
  }
  return image;
}

async function mapPool(items, concurrency, fn) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

async function main() {
  const idSet = new Set();

  for (const { url } of LISTING_URLS) {
    console.log("Listing:", url);
    const html = await fetchText(url);
    for (const id of extractProductIds(html)) idSet.add(id);
  }

  const scrapedMagento = [];

  for (const url of EXTRA_PDP_URLS) {
    console.log("Extra PDP:", url);
    try {
      const html = await fetchText(url);
      if (isMagentoStoreUrl(url)) {
        const erpId = await resolveMagentoStoreProduct(url, html);
        if (erpId) {
          idSet.add(erpId);
          continue;
        }
        const scraped = scrapeMagentoCapsule(url, html);
        if (scraped) {
          scrapedMagento.push(scraped);
          console.log("  (scraped Magento:", scraped.name, ")");
          continue;
        }
        console.warn("  (no sku found, skipped)");
      } else {
        const sku = extractPrimarySkuFromPdp(html);
        if (sku) idSet.add(sku);
        else console.warn("  (no sku found, skipped)");
      }
    } catch (err) {
      console.warn("  (fetch failed:", err.message, ")");
    }
  }

  const ids = [...idSet].sort();
  console.log(`Found ${ids.length} product ids`);

  const products = (
    await mapPool(ids, 6, async (id) => {
      try {
        const p = await fetchProduct(id);
        if (p) process.stdout.write(".");
        else process.stdout.write("x");
        return p;
      } catch {
        process.stdout.write("!");
        return null;
      }
    })
  ).filter(Boolean);

  const byId = new Map(
    products.filter((p) => !isExcludedCapsule(p)).map((p) => [p.id, p]),
  );
  for (const p of scrapedMagento) {
    if (p.line === "vertuo" && !isExcludedCapsule(p)) byId.set(p.id, p);
  }

  for (const [slug, imageUrl] of Object.entries(EXTRA_IMAGE_CRAWL)) {
    console.log("Image crawl:", imageUrl);
    try {
      const scrapedImage = await crawlCapsuleImage(slug, imageUrl);
      if (!scrapedImage) {
        console.warn("  (no capsule image found for", slug, ")");
        continue;
      }
      const product = [...byId.values()].find((p) => p.slug === slug);
      if (product) {
        product.imageUrl = scrapedImage;
        console.log("  →", slug, scrapedImage);
      } else {
        console.warn("  (no catalog product for slug", slug, ")");
      }
    } catch (err) {
      console.warn("  (image crawl failed:", err.message, ")");
    }
  }

  for (const [slug, imagePath] of Object.entries(STATIC_IMAGE_OVERRIDES)) {
    const product = [...byId.values()].find((p) => p.slug === slug);
    if (product) product.imageUrl = imagePath;
  }

  console.log("\nEnriching cup sizes…");
  for (const product of byId.values()) {
    await enrichCupSizeFromOtherMarkets(product);
    const override = CUP_OVERRIDES_BY_SLUG[product.slug];
    if (override) applyCupFields(product, override);
    else if (product.cupSizeLabel) {
      product.cupSizeLabel = formatCupLabel(
        product.cupSizeLabel,
        product.cupSizeMl,
      );
    }
  }

  const merged = [...byId.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "en"),
  );

  console.log(`\nKept ${merged.length} capsules`);

  const payload = {
    market: MARKET,
    language: LANG,
    syncedAt: new Date().toISOString(),
    products: merged,
  };

  const json = JSON.stringify(payload, null, 2);
  fs.mkdirSync(path.dirname(OUT_PUBLIC), { recursive: true });
  fs.mkdirSync(path.dirname(OUT_BUNDLED), { recursive: true });
  fs.writeFileSync(OUT_PUBLIC, json, "utf8");
  fs.writeFileSync(OUT_BUNDLED, json, "utf8");
  console.log("Wrote", OUT_PUBLIC, "and", OUT_BUNDLED);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
