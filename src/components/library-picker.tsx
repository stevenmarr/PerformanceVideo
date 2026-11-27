import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Dialog, EmptyState, Field } from "@/components/ui/kit";
import { HELP } from "@/lib/help/copy";
import { filterGear, gearOrigin, orderGear, rememberId, toggleId, type PickerGear } from "@/lib/library/picker";

const FAVORITES = "pv-gear-favorites";
const RECENT = "pv-gear-recent";

function readIds(key: string): number[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]") as unknown;
    return Array.isArray(parsed) ? parsed.map(Number).filter((id) => Number.isFinite(id)) : [];
  } catch {
    return [];
  }
}

export function LibraryPicker({
  gear,
  onClose,
  onPlace,
  onEdit,
  onDuplicate,
  onBuild,
}: {
  gear: PickerGear[];
  onClose: () => void;
  onPlace: (id: number) => void;
  onEdit: (id: number) => void;
  onDuplicate: (id: number) => void;
  onBuild: () => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [favorites, setFavorites] = useState<number[]>([]);
  const [recent, setRecent] = useState<number[]>([]);

  useEffect(() => {
    setFavorites(readIds(FAVORITES));
    setRecent(readIds(RECENT));
  }, []);

  const categories = useMemo(() => [...new Set(gear.map((item) => item.deviceType))].sort(), [gear]);
  const visible = orderGear(filterGear(gear, query, category), favorites, recent);

  function place(id: number) {
    const next = rememberId(recent, id);
    setRecent(next);
    window.localStorage.setItem(RECENT, JSON.stringify(next));
    onPlace(id);
  }

  return (
    <Dialog title="Library" onClose={onClose}>
      <p className="ui-hint">{HELP.library} Drag a row onto the drawing.</p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <Field label="Search" help="Manufacturer, model, or category.">
          <input className="ui-input" value={query} autoFocus placeholder="ATEM, camera, custom" onChange={(event) => setQuery(event.target.value)} />
        </Field>
        <Field label="Category" help={HELP.customCategory}>
          <select className="ui-select" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">All</option>
            {categories.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </Field>
        <Button variant="primary" onClick={onBuild}>Build custom</Button>
      </div>
      {!visible.length ? (
        <div className="mt-4">
          <EmptyState title="Nothing matches">Clear the search, or build a custom module.</EmptyState>
        </div>
      ) : (
        <ul className="mt-4 max-h-[28rem] space-y-1 overflow-auto">
          {visible.map((item) => {
            const origin = gearOrigin(item);
            return (
              <li key={item.id} className="flex items-center gap-2 rounded-xl px-2 py-2 hover:bg-paper">
                <button
                  type="button"
                  draggable
                  title={HELP.favorites}
                  className="min-w-0 flex-1 text-left"
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/gear-id", String(item.id));
                    event.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => place(item.id)}
                >
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">{item.manufacturer} {item.model}</span>
                    <Badge tone={origin === "custom" ? "custom" : "builtin"}>{origin === "custom" ? "Custom" : "Built-in"}</Badge>
                  </span>
                  <span className="block truncate text-xs text-muted">{item.deviceType}{favorites.includes(item.id) ? " · favorite" : ""}{recent.includes(item.id) ? " · recent" : ""}</span>
                </button>
                <Button title={HELP.favorites} onClick={() => {
                  const next = toggleId(favorites, item.id);
                  setFavorites(next);
                  window.localStorage.setItem(FAVORITES, JSON.stringify(next));
                }}>{favorites.includes(item.id) ? "★" : "☆"}</Button>
                <Button onClick={() => onDuplicate(item.id)}>Duplicate</Button>
                <Button onClick={() => onEdit(item.id)}>Edit</Button>
              </li>
            );
          })}
        </ul>
      )}
    </Dialog>
  );
}
