/** Room above a group frame for its name, clear of the boxes and their pins. */

export const GROUP_LABEL_BAND = 32;
export const GROUP_LABEL_INSET = 6;
export const GROUP_LABEL_HEIGHT = 16;

export function groupFrameBox(minX: number, minY: number, maxX: number, maxY: number) {
  return {
    x: minX - 20,
    y: minY - GROUP_LABEL_BAND,
    w: maxX - minX + 40,
    h: maxY - minY + GROUP_LABEL_BAND + 20,
  };
}

/** The name sits in the band above the highest box, so it cannot cover a pin. */
export function groupLabelClearsNodes(frameY: number, nodeTop: number): boolean {
  return frameY + GROUP_LABEL_INSET + GROUP_LABEL_HEIGHT <= nodeTop;
}
