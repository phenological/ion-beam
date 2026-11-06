import {
  annotateFeatures,
  calculateEic,
  type CompoundMatch,
  getScans,
  type SampleFile,
  type Scan,
  type ScanQuery,
} from "quantion";
import { openIonFile, openSampleBytes } from "./ionFile";
import { forgetSample, getTraffic, subscribe, watchSample } from "./traffic";
import type { FeatureMatches, LibraryMatch, ScanData, ScanFilter, WorkerScope } from "./workerMessages";

const worker = self as unknown as WorkerScope;

const files = new Map<string, SampleFile>();
const running = new Map<string, Set<Promise<void>>>();

subscribe(() => {
  worker.postMessage({ type: "traffic", traffic: getTraffic() });
});

function readError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function track(url: string, task: Promise<void>): void {
  const tasks = running.get(url) ?? new Set<Promise<void>>();
  tasks.add(task);
  running.set(url, tasks);
  task.finally(() => {
    tasks.delete(task);
    if (tasks.size === 0) running.delete(url);
  });
}

function waitForTasks(url: string): Promise<void> {
  const tasks = running.get(url);
  if (!tasks || tasks.size === 0) return Promise.resolve();
  return Promise.allSettled([...tasks]).then(() => undefined);
}

async function open(
  id: number,
  url: string,
  name: string,
  bytes?: ArrayBuffer,
): Promise<void> {
  watchSample(url, name);
  try {
    const file = bytes ? await openSampleBytes(bytes, name) : await openIonFile(url);
    if (!files.has(url)) files.set(url, file);
    else file.dispose?.();
    worker.postMessage({ id, type: "opened" });
  } catch (error: unknown) {
    forgetSample(url);
    worker.postMessage({ id, type: "failed", message: readError(error) });
  }
}

async function readEic(
  id: number,
  url: string,
  mz: number,
  from: number,
  to: number,
  ppm: number,
  mzTol: number,
): Promise<void> {
  const file = files.get(url);
  if (!file) {
    worker.postMessage({ id, type: "failed", message: "the file is no longer open" });
    return;
  }
  const task = calculateEic(file, mz, { from, to, ppmTolerance: ppm, mzTolerance: mzTol })
    .then((eic) => {
      const x = new Float64Array(eic.x);
      const y = new Float64Array(eic.y);
      worker.postMessage({ id, type: "eic", x, y }, [x.buffer, y.buffer]);
    })
    .catch((error: unknown) => {
      worker.postMessage({ id, type: "failed", message: readError(error) });
    });
  track(url, task);
  await task;
}

function readPrecursor(scan: Scan): number | null {
  const mz = scan.precursorMz;
  return Number.isFinite(mz) && mz > 0 ? mz : null;
}

function isNearPrecursor(scan: Scan, filter: ScanFilter): boolean {
  if (filter.precursorMz === undefined) return true;
  const precursor = readPrecursor(scan);
  if (precursor === null) return false;
  return Math.abs(precursor - filter.precursorMz) <= (filter.precursorTolerance ?? 0);
}

function filterByPrecursor(scans: Scan[], filter: ScanFilter): Scan[] {
  if (filter.precursorMz === undefined) return scans;
  const hasPrecursors = scans.some((scan) => readPrecursor(scan) !== null);
  if (!hasPrecursors) return scans;
  return scans.filter((scan) => isNearPrecursor(scan, filter));
}

function copyScanInMzRange(scan: Scan, filter: ScanFilter): ScanData {
  const from = filter.mzFrom ?? -Infinity;
  const to = filter.mzTo ?? Infinity;
  let count = 0;
  for (const mz of scan.mz) if (mz >= from && mz <= to) count += 1;
  const mz = new Float64Array(count);
  const intensity = new Float64Array(count);
  let at = 0;
  for (let i = 0; i < scan.mz.length; i += 1) {
    const value = scan.mz[i];
    if (value < from || value > to) continue;
    mz[at] = value;
    intensity[at] = scan.intensity[i];
    at += 1;
  }
  return { rt: scan.rt, precursorMz: readPrecursor(scan), mz, intensity };
}

function toScanList(found: Scan[] | Scan | null): Scan[] {
  if (found === null) return [];
  return Array.isArray(found) ? found : [found];
}

async function readScans(
  id: number,
  url: string,
  query: ScanQuery,
  level: number,
  filter: ScanFilter,
): Promise<void> {
  const file = files.get(url);
  if (!file) {
    worker.postMessage({ id, type: "failed", message: "the file is no longer open" });
    return;
  }
  const task = getScans(file, query, { level })
    .then((found) => {
      const scans = filterByPrecursor(toScanList(found), filter).map((scan) => copyScanInMzRange(scan, filter));
      const transfer = scans.flatMap((scan) => [scan.mz.buffer, scan.intensity.buffer]);
      worker.postMessage({ id, type: "scans", scans }, transfer);
    })
    .catch((error: unknown) => {
      worker.postMessage({ id, type: "failed", message: readError(error) });
    });
  track(url, task);
  await task;
}

function toLibraryMatch(match: CompoundMatch): LibraryMatch {
  return {
    label: match.label,
    id: match.id,
    database: match.database,
    score: match.score,
    cosine: match.cosine,
    formula: match.metadata.formula ?? "",
    smiles: match.metadata.smiles ?? "",
    mz: new Float64Array(match.mz),
    intensity: new Float64Array(match.intensity),
  };
}

async function findQueryScan(file: SampleFile, mz: number, scanIndex: number | null): Promise<ScanData | null> {
  if (scanIndex === null) return null;
  const window = Math.max(0.005, mz * 20e-6);
  const scans = await getScans(file, { mz: { from: mz - window, to: mz + window } }, { level: 2 });
  const found = scans.find((scan) => scan.index === scanIndex);
  if (!found) return null;
  return { rt: found.rt, precursorMz: readPrecursor(found), mz: new Float64Array(found.mz), intensity: new Float64Array(found.intensity) };
}

async function annotate(
  id: number,
  url: string,
  mz: number,
  rt: number,
  library: string,
  model: string,
  matches: number,
): Promise<void> {
  const file = files.get(url);
  if (!file) {
    worker.postMessage({ id, type: "failed", message: "the file is no longer open" });
    return;
  }
  const task = annotateFeatures([file], [{ mz, rt }], { library, model, matches })
    .then(async (found) => {
      const result = found[0]?.files[0];
      const annotation: FeatureMatches = {
        query: await findQueryScan(file, mz, result?.scanIndex ?? null),
        matches: (result?.matches ?? []).map(toLibraryMatch),
      };
      worker.postMessage({ id, type: "annotation", annotation });
    })
    .catch((error: unknown) => {
      worker.postMessage({ id, type: "failed", message: readError(error) });
    });
  track(url, task);
  await task;
}

function close(url: string): void {
  const file = files.get(url);
  files.delete(url);
  forgetSample(url);
  if (!file) return;
  waitForTasks(url).finally(() => {
    file.dispose?.();
  });
}

worker.addEventListener("message", (event) => {
  const ask = event.data;
  if (ask.type === "open") {
    void open(ask.id, ask.url, ask.name, ask.bytes);
    return;
  }
  if (ask.type === "eic") {
    void readEic(ask.id, ask.url, ask.mz, ask.from, ask.to, ask.ppm, ask.mzTol);
    return;
  }
  if (ask.type === "scans") {
    void readScans(ask.id, ask.url, ask.query, ask.level, ask.filter);
    return;
  }
  if (ask.type === "annotate") {
    void annotate(ask.id, ask.url, ask.mz, ask.rt, ask.library, ask.model, ask.matches);
    return;
  }
  close(ask.url);
});
