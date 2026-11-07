export const uiZoom = 0.8;

export function toLayoutPx(screenPx: number): number {
  return screenPx / uiZoom;
}
