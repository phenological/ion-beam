import { calculateEic, type SampleFile } from "quantion";

export interface Point {
  x: number;
  y: number;
}

export function getMzHalfWindow(mz: number, ppm: number, mzTol: number): number {
  return Math.max(ppm * 1e-6 * mz, mzTol);
}

export function describeMzWindow(mz: number, ppm: number, mzTol: number): string {
  const halfWindow = getMzHalfWindow(mz, ppm, mzTol);
  const usesPpm = ppm * 1e-6 * mz > mzTol;
  const source = usesPpm ? ` (${ppm} ppm)` : "";
  return `m/z ${mz.toFixed(5)} ± ${halfWindow.toFixed(4)} Da${source}`;
}

export async function getEic(
  file: SampleFile,
  mz: number,
  range: { from: number; to: number },
  ppm: number,
  mzTol: number,
): Promise<{ points: Point[] }> {
  const eic = await calculateEic(file, mz, { from: range.from, to: range.to, ppmTolerance: ppm, mzTolerance: mzTol });
  return { points: toPoints(eic.x, eic.y) };
}

function toPoints(x: Float64Array, y: Float64Array): Point[] {
  const points: Point[] = new Array(x.length);
  for (let i = 0; i < x.length; i += 1) {
    points[i] = { x: x[i], y: y[i] };
  }
  return points;
}
