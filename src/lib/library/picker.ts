/** Search, category, favorites, and recent for the gear already in the library. */

export type PickerGear = {
  id: number;
  model: string;
  manufacturer: string;
  deviceType: string;
  kind: string;
  origin: "builtin" | "custom";
  notes: string;
};

export function gearOrigin(item: { kind: string; origin?: string }): "builtin" | "custom" {
  if (item.origin === "custom" || item.kind === "system") return "custom";
  return "builtin";
}

export function filterGear(
  gear: PickerGear[],
  query: string,
  category: string,
): PickerGear[] {
  const needle = query.trim().toLowerCase();
  return gear.filter((item) => {
    if (category && item.deviceType !== category && !(category === "Systems (custom)" && item.origin === "custom")) {
      return false;
    }
    if (!needle) return true;
    return `${item.manufacturer} ${item.model} ${item.deviceType} ${item.notes} ${item.origin}`.toLowerCase().includes(needle);
  });
}

export function orderGear(gear: PickerGear[], favorites: number[], recent: number[]): PickerGear[] {
  const rank = (item: PickerGear) => {
    if (favorites.includes(item.id)) return 0;
    const recentIndex = recent.indexOf(item.id);
    if (recentIndex >= 0) return 1 + recentIndex;
    return 1000;
  };
  return [...gear].sort((a, b) => rank(a) - rank(b) || a.deviceType.localeCompare(b.deviceType) || a.model.localeCompare(b.model));
}

export function toggleId(list: number[], id: number): number[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [id, ...list].slice(0, 40);
}

export function rememberId(list: number[], id: number): number[] {
  return [id, ...list.filter((item) => item !== id)].slice(0, 12);
}
