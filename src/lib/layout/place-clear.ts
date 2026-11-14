export type ScreenRect = { x: number; y: number; w: number; h: number };

function intersects(a: ScreenRect, b: ScreenRect): boolean {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

/** Place a floating menu so it stays on screen and off the selected node. */
export function placeClearOf(
  anchorX: number,
  anchorY: number,
  width: number,
  height: number,
  viewportW: number,
  viewportH: number,
  obstacle: ScreenRect | null,
): { left: number; top: number } {
  const margin = 8;
  const clamp = (left: number, top: number) => ({
    left: Math.max(margin, Math.min(left, Math.max(margin, viewportW - width - margin))),
    top: Math.max(margin, Math.min(top, Math.max(margin, viewportH - height - margin))),
  });
  const candidates = [
    { left: anchorX, top: anchorY },
    { left: anchorX, top: anchorY - height - margin },
    { left: anchorX - width - margin, top: anchorY },
  ];
  if (obstacle) {
    candidates.push(
      { left: obstacle.x + obstacle.w + margin, top: obstacle.y },
      { left: obstacle.x - width - margin, top: obstacle.y },
      { left: obstacle.x, top: obstacle.y + obstacle.h + margin },
      { left: obstacle.x, top: obstacle.y - height - margin },
    );
  }
  for (const candidate of candidates) {
    const placed = clamp(candidate.left, candidate.top);
    if (!obstacle || !intersects({ x: placed.left, y: placed.top, w: width, h: height }, obstacle)) return placed;
  }
  if (!obstacle) return clamp(anchorX, anchorY);
  return clamp(obstacle.x + obstacle.w + margin, obstacle.y + obstacle.h + margin);
}
