/**
 * Remember the drawing the user last had open so the Drawing tab can
 * return to it after a visit to Library, Studio, Title block, or Admin.
 */
export function lastDrawingStorageKey(userId: string): string {
  return `pv-last-drawing:${userId}`;
}

export function readLastDrawingId(
  storage: Pick<Storage, "getItem">,
  userId: string,
): number | null {
  if (!userId) return null;
  const id = Number(storage.getItem(lastDrawingStorageKey(userId)));
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function writeLastDrawingId(
  storage: Pick<Storage, "setItem" | "removeItem">,
  userId: string,
  id: number | null,
): void {
  if (!userId) return;
  const key = lastDrawingStorageKey(userId);
  if (id && id > 0) storage.setItem(key, String(id));
  else storage.removeItem(key);
}

export function pickOpenDrawing<T extends { id: number; templateKey: string }>(
  list: T[],
  lastId: number | null,
): T | undefined {
  if (lastId) {
    const found = list.find((item) => item.id === lastId);
    if (found) return found;
  }
  return (
    list.find((item) => item.templateKey === "jpm") ??
    list.find((item) => item.templateKey === "solventum") ??
    list[0]
  );
}
