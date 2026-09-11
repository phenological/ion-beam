import { getPeak, type Peak, type PeakOptions } from "quantion";
import type { Point } from "./eic";

export type { Peak };

const defaultOptions: PeakOptions = { autoNoise: true, autoBaseline: true };

export const emptyPeak: Peak = {
  from: 0,
  to: 0,
  rt: 0,
  integral: 0,
  intensity: 0,
  nPoints: 0,
  noise: 0,
};

export function getTargetPeak(
  points: Point[],
  rt: number | null,
  range: number,
  options?: PeakOptions,
): Peak {
  if (rt === null || points.length < 3) return emptyPeak;
  const times = new Float64Array(points.length);
  const intensities = new Float64Array(points.length);
  for (let i = 0; i < points.length; i += 1) {
    times[i] = points[i].x;
    intensities[i] = points[i].y;
  }
  return getPeak(times, intensities, rt, range, { ...defaultOptions, ...options });
}
