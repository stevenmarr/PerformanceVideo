/** Fuzzy device lookup. Scores are higher when more of the query is found. */

export type CatalogSearchRecord = {
  id: string;
  manufacturer: string;
  model: string;
  family: string;
  category: string;
  confidence: string;
  unverified: boolean;
  aliases: string[];
  signals: string[];
  connectors: string[];
};

export type CatalogSearchFilters = {
  manufacturer?: string;
  category?: string;
  signal?: string;
  unverified?: "all" | "verified" | "unverified";
};

function norm(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function fieldScore(query: string, value: string, weight: number): number {
  const hay = norm(value);
  if (!hay || !query) return 0;
  if (hay === query) return weight * 5;
  if (hay.startsWith(query)) return weight * 4;
  if (hay.includes(query)) return weight * 3;
  const tokens = query.split(" ").filter(Boolean);
  if (tokens.length > 1 && tokens.every((token) => hay.includes(token))) return weight * 2;
  return 0;
}

export function scoreDevice(record: CatalogSearchRecord, query: string): number {
  const q = norm(query);
  if (!q) return 1;
  return (
    fieldScore(q, record.model, 10) +
    fieldScore(q, record.manufacturer, 6) +
    fieldScore(q, record.family, 5) +
    fieldScore(q, record.category, 3) +
    fieldScore(q, record.aliases.join(" "), 4) +
    fieldScore(q, record.signals.join(" "), 2) +
    fieldScore(q, record.connectors.join(" "), 2) +
    fieldScore(q, record.id, 1)
  );
}

export function searchDevices(
  records: CatalogSearchRecord[],
  query: string,
  filters: CatalogSearchFilters = {},
  limit = 30,
): CatalogSearchRecord[] {
  const manufacturer = filters.manufacturer?.trim().toLowerCase() ?? "";
  const category = filters.category?.trim().toLowerCase() ?? "";
  const signal = filters.signal?.trim().toLowerCase() ?? "";
  const filtered = records.filter((record) => {
    if (manufacturer && record.manufacturer.toLowerCase() !== manufacturer) return false;
    if (category && record.category.toLowerCase() !== category) return false;
    if (signal && !record.signals.some((item) => item.toLowerCase().includes(signal))) return false;
    if (filters.unverified === "verified" && record.unverified) return false;
    if (filters.unverified === "unverified" && !record.unverified) return false;
    return true;
  });
  const ranked = filtered
    .map((record) => ({ record, score: scoreDevice(record, query) }))
    .filter((item) => (norm(query) ? item.score > 0 : true))
    .sort((a, b) => b.score - a.score || a.record.manufacturer.localeCompare(b.record.manufacturer) || a.record.model.localeCompare(b.record.model));
  return ranked.slice(0, Math.max(1, Math.min(50, limit))).map((item) => item.record);
}

const RECENT_KEY = "pv-device-recent";
const FAVORITE_KEY = "pv-device-favorites";

export function readIdList(storage: Storage, key: string): string[] {
  try {
    const parsed = JSON.parse(storage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function rememberDevice(storage: Storage, id: string): string[] {
  const next = [id, ...readIdList(storage, RECENT_KEY).filter((item) => item !== id)].slice(0, 12);
  storage.setItem(RECENT_KEY, JSON.stringify(next));
  return next;
}

export function toggleFavorite(storage: Storage, id: string): string[] {
  const current = readIdList(storage, FAVORITE_KEY);
  const next = current.includes(id) ? current.filter((item) => item !== id) : [id, ...current].slice(0, 40);
  storage.setItem(FAVORITE_KEY, JSON.stringify(next));
  return next;
}

export function recentKey(): string {
  return RECENT_KEY;
}

export function favoriteKey(): string {
  return FAVORITE_KEY;
}
