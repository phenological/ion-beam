import type { Point } from "./eic";
import { readScans } from "./ionClient";
import type { ScanData } from "./workerMessages";

export const ms2MzMargin = 5;
export const closestPrecursorLimit = 0.003;

const ms1RtWindow = 0.01;
const ms2RtWindow = 0.05;
const ms1MergeTolerance = 0.0001;
const precursorPpm = 10;
const precursorDalton = 0.001;
const fragmentPpm = 50;
const fragmentDalton = 0.01;

export interface Spectrum {
  points: Point[];
  scanCount: number;
  precursorMz: number | null;
  rt: number | null;
}

export interface RtRange {
  from: number;
  to: number;
}

function getFragmentWindow(mz: number): number {
  return Math.max(fragmentPpm * 1e-6 * mz, fragmentDalton);
}

function getPrecursorWindow(mz: number): number {
  return Math.max(precursorPpm * 1e-6 * mz, precursorDalton);
}

export function mergeScans(scans: ScanData[], getWindow: (mz: number) => number): Point[] {
  const peaks: Point[] = [];
  for (const scan of scans) {
    for (let i = 0; i < scan.mz.length; i += 1) {
      if (scan.intensity[i] > 0) peaks.push({ x: scan.mz[i], y: scan.intensity[i] });
    }
  }
  peaks.sort((a, b) => a.x - b.x);

  const merged: Point[] = [];
  let weightedMz = 0;
  for (const peak of peaks) {
    const last = merged[merged.length - 1];
    if (last && peak.x - last.x <= getWindow(peak.x)) {
      weightedMz += peak.x * peak.y;
      last.y += peak.y;
      last.x = weightedMz / last.y;
      continue;
    }
    merged.push({ x: peak.x, y: peak.y });
    weightedMz = peak.x * peak.y;
  }
  return merged;
}

function toSpectrum(scans: ScanData[], getWindow: (mz: number) => number): Spectrum {
  const first = scans[0];
  return {
    points: mergeScans(scans, getWindow),
    scanCount: scans.length,
    precursorMz: first?.precursorMz ?? null,
    rt: first?.rt ?? null,
  };
}

export function getMs2RangeAround(rt: number): RtRange {
  return { from: rt - ms2RtWindow, to: rt + ms2RtWindow };
}

export async function getMs1Spectrum(
  url: string,
  mz: number,
  rt: number,
  mzHalfWindow: number,
): Promise<Spectrum> {
  const filter = { mzFrom: mz - mzHalfWindow, mzTo: mz + mzHalfWindow };
  const range = { from: rt - ms1RtWindow, to: rt + ms1RtWindow };
  const inRange = await readScans(url, { rt: range }, 1, filter);
  const scans =
    inRange.length > 0 ? inRange : await readScans(url, { rt }, 1, filter);
  return toSpectrum(scans, () => ms1MergeTolerance);
}

export async function getMs2Spectrum(url: string, mz: number, range: RtRange): Promise<Spectrum> {
  const scans = await readScans(url, { rt: range }, 2, {
    mzTo: mz + ms2MzMargin,
    precursorMz: mz,
    precursorTolerance: getPrecursorWindow(mz),
  });
  return toSpectrum(scans, getFragmentWindow);
}

export async function getClosestMs2(url: string, mz: number): Promise<Spectrum> {
  const scans = await readScans(url, { mz }, 2, {});
  return toSpectrum(scans, getFragmentWindow);
}
