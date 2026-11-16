/**
 * Where a new or duplicated box lands on the drawing.
 * The canvas grid is 18px. Duplicates sit two cells down and right so the
 * original stays visible. Sequential adds sit one box width plus a gap to
 * the right so they do not overlap.
 */
export const CANVAS_GRID = 18;
export const DUPLICATE_OFFSET = { x: CANVAS_GRID * 2, y: CANVAS_GRID * 2 };
export const PLACE_GAP = CANVAS_GRID * 2;

export type Point = { x: number; y: number };
export type BoxSize = { width: number; height: number };
export type LastPlaced = Point & BoxSize & { origin?: string | null };

export function offsetFrom(origin: Point, size: BoxSize, mode: "duplicate" | "place"): Point {
  if (mode === "duplicate") {
    return { x: origin.x + DUPLICATE_OFFSET.x, y: origin.y + DUPLICATE_OFFSET.y };
  }
  return { x: origin.x + size.width + PLACE_GAP, y: origin.y };
}

export function defaultPlacePosition(count: number): Point {
  return { x: 48 + count * 300, y: 48 };
}

/**
 * explicit: a drop point or the right-click that opened the add-gear menu.
 * origin: stable id for one add-gear menu. Later picks from the same menu
 * (and implicit adds from the palette or gear bar) continue from lastPlaced.
 * A new right-click (different origin) starts a new cluster at that click.
 */
export function resolvePlacePosition(input: {
  explicit?: Point;
  last?: LastPlaced | null;
  count: number;
  origin?: string | null;
}): Point {
  const sameOrigin = Boolean(
    input.origin && input.last?.origin && input.origin === input.last.origin,
  );
  if (input.last && (!input.explicit || sameOrigin)) {
    return offsetFrom(input.last, { width: input.last.width, height: input.last.height }, "place");
  }
  if (input.explicit) return input.explicit;
  return defaultPlacePosition(input.count);
}
