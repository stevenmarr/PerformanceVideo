/** Where the instance editor sits so it stays off the selected node's pins. */
export function instanceDockSide(viewportWidth: number): "bottom" | "side" {
  return viewportWidth >= 1024 ? "side" : "bottom";
}
