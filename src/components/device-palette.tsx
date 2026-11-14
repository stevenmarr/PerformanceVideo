import { useEffect, useMemo, useRef, useState } from "react";
import { searchCatalog } from "@/lib/catalog/lookup.functions";
import { favoriteKey, readIdList, recentKey, rememberDevice, toggleFavorite } from "@/lib/catalog/search";

type Hit = {
  id: string;
  manufacturer: string;
  model: string;
  family: string;
  category: string;
  confidence: string;
  unverified: boolean;
  notes: string;
};

export function DevicePalette({
  open,
  onClose,
  onPlace,
}: {
  open: boolean;
  onClose: () => void;
  onPlace: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [category, setCategory] = useState("");
  const [signal, setSignal] = useState("");
  const [unverified, setUnverified] = useState<"all" | "verified" | "unverified">("all");
  const [hits, setHits] = useState<Hit[]>([]);
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [imported, setImported] = useState(true);
  const [active, setActive] = useState(0);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setFavorites(readIdList(window.localStorage, favoriteKey()));
    setRecent(readIdList(window.localStorage, recentKey()));
    input.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      void searchCatalog({
        data: { query, manufacturer, category, signal, unverified },
      }).then((result) => {
        setImported(result.imported);
        setManufacturers(result.manufacturers);
        setCategories(result.categories);
        setHits(result.hits);
        setActive(0);
      });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [open, query, manufacturer, category, signal, unverified]);

  const ordered = useMemo(() => {
    if (query.trim()) return hits;
    const fav = hits.filter((hit) => favorites.includes(hit.id));
    const rec = hits.filter((hit) => recent.includes(hit.id) && !favorites.includes(hit.id));
    const rest = hits.filter((hit) => !favorites.includes(hit.id) && !recent.includes(hit.id));
    return [...fav, ...rec, ...rest];
  }, [hits, favorites, recent, query]);

  if (!open) return null;

  function choose(id: string) {
    rememberDevice(window.localStorage, id);
    setRecent(readIdList(window.localStorage, recentKey()));
    onPlace(id);
    onClose();
  }

  return (
    <div className="absolute inset-0 z-40 flex items-start justify-center bg-ink/30 p-4" onMouseDown={onClose}>
      <div
        className="mt-10 w-full max-w-2xl rounded-2xl border border-line bg-panel p-3 text-ink shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <input
          ref={input}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") onClose();
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((current) => Math.min(ordered.length - 1, current + 1));
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((current) => Math.max(0, current - 1));
            }
            if (event.key === "Enter" && ordered[active]) choose(ordered[active].id);
          }}
          placeholder="Search manufacturer, model, family, category, or port"
          className="w-full rounded-xl border border-line bg-paper px-3 py-3 text-sm outline-none"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <select value={manufacturer} onChange={(event) => setManufacturer(event.target.value)} className="rounded-lg border border-line bg-paper px-2 py-1 text-xs">
            <option value="">All manufacturers</option>
            {manufacturers.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-lg border border-line bg-paper px-2 py-1 text-xs">
            <option value="">All categories</option>
            {categories.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <input value={signal} onChange={(event) => setSignal(event.target.value)} placeholder="Port type" className="rounded-lg border border-line bg-paper px-2 py-1 text-xs" />
          <select value={unverified} onChange={(event) => setUnverified(event.target.value as typeof unverified)} className="rounded-lg border border-line bg-paper px-2 py-1 text-xs">
            <option value="all">Any ports</option>
            <option value="verified">Confirmed ports</option>
            <option value="unverified">Unverified ports</option>
          </select>
        </div>
        {!imported ? (
          <p className="mt-3 text-sm text-muted">The global device library has not been imported yet.</p>
        ) : (
          <ul className="mt-3 max-h-80 overflow-auto">
            {ordered.map((hit, index) => (
              <li key={hit.id}>
                <div className={`flex items-center gap-2 rounded-xl px-2 py-2 ${index === active ? "bg-paper" : ""}`}>
                  <button
                    type="button"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/catalog-id", hit.id);
                      event.dataTransfer.effectAllowed = "copy";
                    }}
                    onClick={() => choose(hit.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate text-sm font-semibold">
                      {hit.manufacturer} {hit.model}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {hit.family || hit.category}
                      {hit.unverified ? " · unverified ports" : ` · ${hit.confidence}`}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="px-2 text-sm"
                    aria-label={favorites.includes(hit.id) ? "Remove favorite" : "Favorite"}
                    onClick={() => setFavorites(toggleFavorite(window.localStorage, hit.id))}
                  >
                    {favorites.includes(hit.id) ? "★" : "☆"}
                  </button>
                </div>
              </li>
            ))}
            {!ordered.length ? <li className="px-2 py-3 text-sm text-muted">No devices match.</li> : null}
          </ul>
        )}
        <p className="mt-2 text-xs text-muted">Enter places the device. Drag a row onto the canvas. Esc closes.</p>
      </div>
    </div>
  );
}
