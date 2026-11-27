/** Undo stack for the drawing. Dragging a box is one step, not one step per pixel. */

export type HistoryEntry<T> = { label: string; state: T };

export function pushHistory<T>(past: HistoryEntry<T>[], entry: HistoryEntry<T>, limit = 40): HistoryEntry<T>[] {
  const last = past[past.length - 1];
  if (last && JSON.stringify(last.state) === JSON.stringify(entry.state)) return past;
  return [...past, entry].slice(-limit);
}

export function undoHistory<T>(past: HistoryEntry<T>[], future: HistoryEntry<T>[], present: HistoryEntry<T>): {
  past: HistoryEntry<T>[];
  future: HistoryEntry<T>[];
  present: HistoryEntry<T> | null;
} {
  const previous = past[past.length - 1];
  if (!previous) return { past, future, present: null };
  return { past: past.slice(0, -1), future: [...future, present], present: previous };
}

export function redoHistory<T>(past: HistoryEntry<T>[], future: HistoryEntry<T>[], present: HistoryEntry<T>): {
  past: HistoryEntry<T>[];
  future: HistoryEntry<T>[];
  present: HistoryEntry<T> | null;
} {
  const next = future[future.length - 1];
  if (!next) return { past, future, present: null };
  return { past: [...past, present], future: future.slice(0, -1), present: next };
}
