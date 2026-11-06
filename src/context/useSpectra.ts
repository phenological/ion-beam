import { useEffect, useState } from "react";
import { describeMzWindow, getMzHalfWindow, type Point } from "../ms/eic";
import type { Peak } from "../ms/peaks";
import {
  closestPrecursorLimit,
  getClosestMs2,
  getMs1Spectrum,
  getMs2RangeAround,
  getMs2Spectrum,
  ms2MzMargin,
  type RtRange,
  type Spectrum,
} from "../ms/spectra";
import { readError, type Trace } from "./reducer";

export interface SpectrumSample {
  id: string;
  name: string;
  url: string;
  color: string;
}

export interface SpectrumTarget {
  key: string;
  mz: number;
  rt: number | null;
  peakRange: RtRange | null;
  main: SpectrumSample;
  samples: SpectrumSample[];
}

export interface SpectrumLine {
  id: string;
  color: string;
  points: Point[];
}

export interface SpectrumPanel {
  status: "idle" | "loading" | "ready" | "failed";
  label: string;
  lines: SpectrumLine[];
  xMin?: number;
  xMax?: number;
  markMz: number | null;
  precursorMz: number | null;
  message?: string;
}

interface SampleSpectrum {
  sample: SpectrumSample;
  spectrum: Spectrum;
}

interface LoadedPanel {
  key: string;
  panel: SpectrumPanel;
}

const idlePanel: SpectrumPanel = {
  status: "idle",
  label: "",
  lines: [],
  markMz: null,
  precursorMz: null,
};

const loadingPanel: SpectrumPanel = { ...idlePanel, status: "loading" };

function toSample(trace: Trace): SpectrumSample {
  return { id: trace.id, name: trace.sample, url: trace.url, color: trace.color };
}

export function readSpectrumTarget(
  traces: Trace[],
  mainPeak: Peak | null,
  peakPending: boolean,
): SpectrumTarget | null {
  if (peakPending) return null;
  const main = traces.find((trace) => trace.main);
  if (!main || main.mz === null || main.status !== "ready") return null;
  const foundPeak = mainPeak && mainPeak.intensity > 0 ? mainPeak : null;
  const rt = foundPeak ? foundPeak.rt : main.rt;
  const peakRange = foundPeak ? { from: foundPeak.from, to: foundPeak.to } : null;
  const samples = traces
    .filter((trace) => trace.compound === null && trace.status === "ready")
    .map(toSample);
  const key = [
    main.mz,
    rt,
    peakRange?.from,
    peakRange?.to,
    ...samples.map((sample) => `${sample.url}:${sample.color}`),
  ].join("|");
  return { key, mz: main.mz, rt, peakRange, main: toSample(main), samples };
}

function toLines(spectra: SampleSpectrum[]): SpectrumLine[] {
  return spectra
    .filter((item) => item.spectrum.points.length > 0)
    .map((item) => ({ id: item.sample.id, color: item.sample.color, points: item.spectrum.points }));
}

function countSamples(count: number): string {
  return count === 1 ? "1 sample" : `${count} samples`;
}

function buildMs1Panel(
  spectra: SampleSpectrum[],
  mz: number,
  rt: number,
  ppm: number,
  mzTol: number,
): SpectrumPanel {
  const lines = toLines(spectra);
  const mzHalfWindow = getMzHalfWindow(mz, ppm, mzTol);
  const window = describeMzWindow(mz, ppm, mzTol);
  return {
    status: "ready",
    label: `MS1 @ RT ${rt.toFixed(3)} min · ${window} · ${countSamples(lines.length)}`,
    lines,
    xMin: mz - mzHalfWindow,
    xMax: mz + mzHalfWindow,
    markMz: mz,
    precursorMz: null,
    message: lines.length === 0 ? `No MS1 signal near m/z ${mz.toFixed(5)}` : undefined,
  };
}

function hasScansWithoutPrecursor(spectra: SampleSpectrum[]): boolean {
  return spectra.some((item) => item.spectrum.scanCount > 0 && item.spectrum.precursorMz === null);
}

function buildMs2Panel(spectra: SampleSpectrum[], mz: number, range: RtRange): SpectrumPanel {
  const lines = toLines(spectra);
  const window = `RT ${range.from.toFixed(3)}–${range.to.toFixed(3)} min`;
  const isolation = hasScansWithoutPrecursor(spectra) ? " · no precursor isolation" : "";
  const precursorMz =
    spectra.map((item) => item.spectrum.precursorMz).find((value) => value !== null) ?? null;
  return {
    status: "ready",
    label: `MS2 @ m/z ${mz.toFixed(5)} · ${window} · ${countSamples(lines.length)}${isolation}`,
    lines,
    xMin: 0,
    xMax: mz + ms2MzMargin,
    markMz: mz,
    precursorMz,
    message: lines.length === 0 ? `No MS2 scans at this precursor in ${window}` : undefined,
  };
}

function buildClosestMs2Panel(sample: SpectrumSample, spectrum: Spectrum, mz: number): SpectrumPanel {
  const precursor = spectrum.precursorMz;
  const tooFar = precursor !== null && Math.abs(precursor - mz) > closestPrecursorLimit;
  if (spectrum.scanCount === 0 || tooFar) {
    const nearest = precursor === null ? "" : ` · nearest ${precursor.toFixed(4)}`;
    return {
      ...idlePanel,
      status: "ready",
      label: `MS2 closest to m/z ${mz.toFixed(4)}`,
      message: `No MS2 within ${closestPrecursorLimit} of m/z ${mz.toFixed(4)}${nearest}`,
    };
  }
  const rt = spectrum.rt === null ? "" : ` @ RT ${spectrum.rt.toFixed(3)} min`;
  return {
    status: "ready",
    label: `MS2${rt} · closest to m/z ${mz.toFixed(4)} · ${sample.name}`,
    lines: [{ id: sample.id, color: sample.color, points: spectrum.points }],
    xMin: 0,
    xMax: (precursor ?? mz) + ms2MzMargin,
    markMz: precursor ?? mz,
    precursorMz: precursor,
  };
}

function failedPanel(error: unknown): SpectrumPanel {
  return { ...idlePanel, status: "failed", message: readError(error) };
}

function runWhileMounted(
  task: Promise<SpectrumPanel>,
  show: (panel: SpectrumPanel) => void,
): () => void {
  let mounted = true;
  task.then(
    (panel) => {
      if (mounted) show(panel);
    },
    (error: unknown) => {
      if (mounted) show(failedPanel(error));
    },
  );
  return () => {
    mounted = false;
  };
}

function getShownPanel(loaded: LoadedPanel | null, key: string | null): SpectrumPanel {
  if (key === null) return idlePanel;
  return loaded?.key === key ? loaded.panel : loadingPanel;
}

function getSpectraForSamples(
  samples: SpectrumSample[],
  read: (sample: SpectrumSample) => Promise<Spectrum>,
): Promise<SampleSpectrum[]> {
  return Promise.all(
    samples.map((sample) => read(sample).then((spectrum) => ({ sample, spectrum }))),
  );
}

function getMs1RequestKey(
  enabled: boolean,
  target: SpectrumTarget | null,
  rt: number | null,
  ppm: number,
  mzTol: number,
): string | null {
  if (!enabled || target === null || rt === null) return null;
  return `${target.key}|${rt}|${ppm}|${mzTol}`;
}

export function useMs1Panel(
  enabled: boolean,
  target: SpectrumTarget | null,
  rt: number | null,
  ppm: number,
  mzTol: number,
): SpectrumPanel {
  const [loaded, setLoaded] = useState<LoadedPanel | null>(null);
  const key = getMs1RequestKey(enabled, target, rt, ppm, mzTol);

  useEffect(() => {
    const key = getMs1RequestKey(enabled, target, rt, ppm, mzTol);
    if (key === null || target === null || rt === null) return undefined;
    const mzHalfWindow = getMzHalfWindow(target.mz, ppm, mzTol);
    const task = getSpectraForSamples(target.samples, (sample) =>
      getMs1Spectrum(sample.url, target.mz, rt, mzHalfWindow),
    ).then((spectra) => buildMs1Panel(spectra, target.mz, rt, ppm, mzTol));
    return runWhileMounted(task, (panel) => setLoaded({ key, panel }));
  }, [enabled, target, rt, ppm, mzTol]);

  return getShownPanel(loaded, key);
}

function getMs2RequestKey(
  enabled: boolean,
  target: SpectrumTarget | null,
  from: number | null,
  to: number | null,
  closestMz: number | null,
): string | null {
  if (!enabled || target === null) return null;
  if (closestMz !== null) return `${target.key}|closest|${closestMz}`;
  if (from === null || to === null) return null;
  return `${target.key}|${from}|${to}`;
}

function loadMs2Panel(
  target: SpectrumTarget,
  range: RtRange | null,
  closestMz: number | null,
): Promise<SpectrumPanel> | null {
  const { mz, main, samples } = target;
  if (closestMz !== null) {
    return getClosestMs2(main.url, closestMz).then((spectrum) =>
      buildClosestMs2Panel(main, spectrum, closestMz),
    );
  }
  if (range === null) return null;
  return getSpectraForSamples(samples, (sample) => getMs2Spectrum(sample.url, mz, range)).then(
    (spectra) => buildMs2Panel(spectra, mz, range),
  );
}

export function useMs2Panel(
  enabled: boolean,
  target: SpectrumTarget | null,
  rt: number | null,
  closestMz: number | null,
): SpectrumPanel {
  const [loaded, setLoaded] = useState<LoadedPanel | null>(null);
  const range = target?.peakRange ?? (rt === null ? null : getMs2RangeAround(rt));
  const from = range?.from ?? null;
  const to = range?.to ?? null;
  const key = getMs2RequestKey(enabled, target, from, to, closestMz);

  useEffect(() => {
    const key = getMs2RequestKey(enabled, target, from, to, closestMz);
    if (key === null || target === null) return undefined;
    const range = from === null || to === null ? null : { from, to };
    const task = loadMs2Panel(target, range, closestMz);
    if (task === null) return undefined;
    return runWhileMounted(task, (panel) => setLoaded({ key, panel }));
  }, [enabled, target, from, to, closestMz]);

  return getShownPanel(loaded, key);
}
