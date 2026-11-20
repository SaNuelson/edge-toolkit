import type { GameCandidate } from "./types";

type JsonObject = Record<string, unknown>;

const PRODUCT_TYPE = /(^|\/)product$/i;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasType(value: unknown, expected: RegExp): boolean {
  const types = Array.isArray(value) ? value : [value];
  return types.some((type) => typeof type === "string" && expected.test(type));
}

function collectProducts(value: unknown, products: JsonObject[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collectProducts(item, products);
    return;
  }

  if (!isObject(value)) return;
  if (hasType(value["@type"], PRODUCT_TYPE)) products.push(value);

  const graph = value["@graph"];
  if (graph) collectProducts(graph, products);
}

function contentOf(document: Document, selector: string): string | undefined {
  const value = document.querySelector<HTMLMetaElement>(selector)?.content.trim();
  return value || undefined;
}

export function cleanProductName(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s+(?:\||[-–—]|::)\s+[^|–—:]{2,60}$/u, "")
    .replace(/^buy\s+/i, "")
    .trim();
}

export function detectGameCandidates(document: Document): GameCandidate[] {
  const candidates: GameCandidate[] = [];
  const products: JsonObject[] = [];

  for (const script of document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]')) {
    try {
      collectProducts(JSON.parse(script.textContent ?? ""), products);
    } catch {
      // Invalid vendor metadata should not prevent the remaining heuristics.
    }
  }

  for (const product of products) {
    if (typeof product.name === "string") {
      candidates.push({ name: product.name, confidence: 1, source: "schema.org Product" });
    }
  }

  const productTitle = contentOf(document, 'meta[property="product:title"], meta[name="product:title"]');
  if (productTitle) candidates.push({ name: productTitle, confidence: 0.96, source: "product metadata" });

  const productElementName = document
    .querySelector<HTMLElement>('[itemscope][itemtype*="schema.org/Product"] [itemprop="name"]')
    ?.textContent?.trim();
  if (productElementName) {
    candidates.push({ name: productElementName, confidence: 0.94, source: "Product microdata" });
  }

  const isProductPage =
    products.length > 0 ||
    contentOf(document, 'meta[property="og:type"]')?.toLowerCase() === "product" ||
    Boolean(document.querySelector('[itemprop="price"], meta[property="product:price:amount"]'));

  if (isProductPage) {
    const openGraphTitle = contentOf(document, 'meta[property="og:title"]');
    if (openGraphTitle) {
      candidates.push({ name: openGraphTitle, confidence: 0.88, source: "Open Graph" });
    }

    const heading = document.querySelector<HTMLHeadingElement>("h1")?.textContent?.trim();
    if (heading) candidates.push({ name: heading, confidence: 0.84, source: "page heading" });
  }

  const unique = new Map<string, GameCandidate>();
  for (const candidate of candidates) {
    const name = cleanProductName(candidate.name);
    if (name.length < 2 || name.length > 180) continue;
    const key = name.toLocaleLowerCase();
    const existing = unique.get(key);
    if (!existing || candidate.confidence > existing.confidence) {
      unique.set(key, { ...candidate, name });
    }
  }

  return [...unique.values()].sort((left, right) => right.confidence - left.confidence).slice(0, 4);
}
