import { produce } from "immer";
import type { PeakOptions } from "quantion";
import type { Point } from "../ms/eic";
import { emptyPeak, type Peak } from "../ms/peaks";
import type { Compound } from "../data/compounds";
import { findDataset } from "../data/datasets";
import { defaultMz, defaultPaths, defaultRtWindow } from "../data/targets";
import { readPaths } from "../utilities/savedPaths";
import { isWideScreen } from "../utilities/screen";
import type { Entry } from "../ms/listSamples";

export interface SamplesState {
  path: string;
  status: "ok" | "error";
  entries?: Entry[];
  message?: string;
}

export interface FileState {
  url: string;
  status: "ok" | "error";
  message?: string;
}

export interface Outcome {
  key: string;
  status: "ok" | "error";
  points?: Point[];
  message?: string;
}

export interface SamplePeaks {
  sample: string;
  color: string;
  main: boolean;
  peak: Peak;
  ready: boolean;
}

export interface CompoundSet {
  id: string;
  status: "ok" | "error";
  list?: Compound[];
  message?: string;
}

export interface AddedSample {
  name: string;
  styleIndex: number;
}

export interface State {
  path: string;
  savedPaths: string[];
  folderStack: string[];
  pickedSample: string | null;
  addedSamples: AddedSample[];
  mzText: string;
  pickedMz: number | null;
  pickedLabel: string | null;
  targetRt: number | null;
  targetRtWindow: number;
  wideScreen: boolean;
  samplesOpen: boolean;
  metabolitesOpen: boolean;
  inspectOpen: boolean;
  samplesWidth: number;
  metabolitesWidth: number;
  minIntensity: number;
  minIntegral: number;
  minWidth: number;
  minSnr: number;
  autoNoise: boolean;
  autoBaseline: boolean;
  allowOverlap: boolean;
  annotate: boolean;
  displayBaseline: boolean;
  autoPeakPicking: boolean;
  rtFrom: number;
  rtTo: number;
  ppm: number;
  mzTol: number;
  samples: SamplesState | null;
  files: Record<string, FileState>;
  outcomes: Record<string, Outcome>;
  peaksByKey: Record<string, Peak>;
  compoundSet: CompoundSet | null;
  compoundEdits: Record<string, Compound[]>;
  uploadStatus: { status: "reading" } | { status: "error"; message: string } | null;
}

const startPaths = readPaths(defaultPaths);
const startsWide = isWideScreen();
const startDataset = findDataset(startPaths[0] ?? "");

export const initialState: State = {
  path: startPaths[0] ?? "",
  savedPaths: startPaths,
  folderStack: [],
  pickedSample: null,
  addedSamples: [],
  mzText: String(defaultMz),
  pickedMz: null,
  pickedLabel: null,
  targetRt: null,
  targetRtWindow: defaultRtWindow,
  wideScreen: startsWide,
  samplesOpen: startsWide,
  metabolitesOpen: startsWide,
  inspectOpen: false,
  samplesWidth: 300,
  metabolitesWidth: 320,
  minIntensity: 500,
  minIntegral: 0,
  minWidth: 2,
  minSnr: 2,
  autoNoise: true,
  autoBaseline: true,
  allowOverlap: false,
  annotate: true,
  displayBaseline: false,
  autoPeakPicking: true,
  rtFrom: startDataset.rtRange.from,
  rtTo: startDataset.rtRange.to,
  ppm: 20,
  mzTol: 0.005,
  samples: null,
  files: {},
  outcomes: {},
  peaksByKey: {},
  compoundSet: startDataset.file
    ? null
    : { id: startDataset.id, status: "ok", list: startDataset.list },
  compoundEdits: {},
  uploadStatus: null,
};

export type Action =
  | { type: "reloadSamples" }
  | { type: "setPath"; path: string }
  | { type: "openFolder"; path: string }
  | { type: "goUp" }
  | { type: "addPath"; path: string }
  | { type: "removePath"; path: string }
  | { type: "pickSample"; name: string }
  | { type: "toggleSample"; name: string }
  | { type: "changeMz"; value: string }
  | { type: "pickCompound"; compound: Compound }
  | { type: "setWideScreen"; wide: boolean }
  | { type: "toggleSamples" }
  | { type: "toggleMetabolites" }
  | { type: "toggleInspect" }
  | { type: "setSamplesWidth"; value: number }
  | { type: "setMetabolitesWidth"; value: number }
  | { type: "setMinIntensity"; value: number }
  | { type: "setMinIntegral"; value: number }
  | { type: "setMinWidth"; value: number }
  | { type: "setMinSnr"; value: number }
  | { type: "toggleAutoNoise" }
  | { type: "toggleAutoBaseline" }
  | { type: "toggleAllowOverlap" }
  | { type: "toggleAnnotate" }
  | { type: "toggleDisplayBaseline" }
  | { type: "toggleAutoPeakPicking" }
  | { type: "setRtFrom"; value: number }
  | { type: "setRtTo"; value: number }
  | { type: "setRtRange"; from: number; to: number }
  | { type: "setPpm"; value: number }
  | { type: "setMzTol"; value: number }
  | { type: "samplesLoaded"; path: string; entries: Entry[] }
  | { type: "samplesFailed"; path: string; message: string }
  | { type: "fileOpened"; url: string }
  | { type: "fileFailed"; url: string; message: string }
  | { type: "fileClosed"; url: string }
  | { type: "eicReady"; url: string; key: string; points: Point[] }
  | { type: "eicFailed"; url: string; key: string; message: string }
  | { type: "peakFound"; key: string; peak: Peak }
  | { type: "compoundsLoaded"; id: string; list: Compound[] }
  | { type: "compoundsFailed"; id: string; message: string }
  | { type: "addCompound"; compound: Compound }
  | { type: "updateCompound"; original: string; compound: Compound }
  | { type: "removeCompound"; label: string }
  | { type: "replaceCompounds"; list: Compound[] }
  | { type: "uploadStarted" }
  | { type: "uploadFailed"; message: string };

const minPanelWidth = 220;
const maxPanelWidth = 560;

const traceColors = [
  "#334155",
  "#0072b2",
  "#c48218",
  "#8b5500",
  "#9776fb",
  "#cf386d",
  "#009eaf",
  "#2841b9",
  "#851286",
  "#eb5485",
  "#a76c00",
  "#b13290",
  "#805ddf",
  "#9c0230",
  "#086e53",
  "#c364d9",
  "#bc1f4b",
  "#4252cd",
  "#0084ba",
  "#91056b",
  "#d64992",
  "#5aa04a",
  "#a91e76",
  "#7a28a2",
  "#bb42a4",
  "#01614d",
  "#b657cc",
  "#9a600b",
  "#8a4000",
  "#8c69ed",
  "#b6770b",
  "#c53c8e",
];

export const colorsBeforeRepeat = traceColors.length;

export function traceColor(styleIndex: number): string {
  return traceColors[styleIndex % traceColors.length];
}

function clampPanelWidth(value: number): number {
  if (value < minPanelWidth) return minPanelWidth;
  if (value > maxPanelWidth) return maxPanelWidth;
  return value;
}

function findFreeStyle(added: AddedSample[]): number {
  const taken = new Set(added.map((sample) => sample.styleIndex));
  let index = 1;
  while (taken.has(index)) index += 1;
  return index;
}

function getDatasetId(draft: State): string {
  return findDataset(datasetPath(draft)).id;
}

function getWorkingList(draft: State): Compound[] {
  const id = getDatasetId(draft);
  if (!draft.compoundEdits[id]) {
    const loaded = draft.compoundSet?.id === id ? draft.compoundSet.list : undefined;
    draft.compoundEdits[id] = loaded ? [...loaded] : [];
  }
  return draft.compoundEdits[id];
}

function forgetPeaks(draft: State): void {
  draft.peaksByKey = {};
}

export function reducer(state: State, action: Action): State {
  return produce(state, (draft: State) => {
    switch (action.type) {
      case "reloadSamples":
        draft.samples = null;
        break;
      case "setPath":
        draft.path = action.path;
        draft.folderStack = [];
        draft.pickedSample = null;
        draft.addedSamples = [];
        draft.pickedMz = null;
        draft.pickedLabel = null;
        draft.targetRt = null;
        draft.uploadStatus = null;
        forgetPeaks(draft);
        break;
      case "addPath": {
        const path = action.path.trim();
        if (path.length > 0 && !draft.savedPaths.includes(path)) {
          draft.savedPaths.push(path);
        }
        break;
      }
      case "removePath": {
        draft.savedPaths = draft.savedPaths.filter((item) => item !== action.path);
        draft.path = "";
        draft.folderStack = [];
        draft.pickedSample = null;
        draft.addedSamples = [];
        draft.pickedMz = null;
        draft.pickedLabel = null;
        draft.targetRt = null;
        draft.uploadStatus = null;
        forgetPeaks(draft);
        break;
      }
      case "openFolder":
        draft.folderStack.push(draft.path);
        draft.path = action.path;
        draft.pickedSample = null;
        draft.addedSamples = [];
        draft.pickedMz = null;
        draft.pickedLabel = null;
        draft.targetRt = null;
        draft.uploadStatus = null;
        forgetPeaks(draft);
        break;
      case "goUp": {
        const previous = draft.folderStack.pop();
        if (previous === undefined) break;
        draft.path = previous;
        draft.pickedSample = null;
        draft.addedSamples = [];
        draft.pickedMz = null;
        draft.pickedLabel = null;
        draft.targetRt = null;
        draft.uploadStatus = null;
        forgetPeaks(draft);
        break;
      }
      case "pickSample":
        draft.pickedSample = action.name;
        draft.addedSamples = [];
        draft.samplesOpen = draft.wideScreen;
        break;
      case "setWideScreen":
        draft.wideScreen = action.wide;
        draft.samplesOpen = action.wide;
        draft.metabolitesOpen = action.wide;
        break;
      case "toggleSample": {
        if (action.name === draft.pickedSample) break;
        const at = draft.addedSamples.findIndex(
          (sample) => sample.name === action.name,
        );
        if (at !== -1) {
          draft.addedSamples.splice(at, 1);
          break;
        }
        const styleIndex = findFreeStyle(draft.addedSamples);
        draft.addedSamples.push({ name: action.name, styleIndex });
        break;
      }
      case "changeMz":
        draft.mzText = action.value;
        draft.pickedMz = readMz(action.value);
        draft.pickedLabel = null;
        draft.targetRt = null;
        draft.targetRtWindow = defaultRtWindow;
        forgetPeaks(draft);
        break;
      case "pickCompound":
        draft.mzText = String(action.compound.mz);
        draft.pickedMz = action.compound.mz;
        draft.pickedLabel = action.compound.label;
        draft.targetRt = action.compound.rt;
        draft.targetRtWindow = action.compound.sd ?? defaultRtWindow;
        draft.metabolitesOpen = draft.wideScreen;
        forgetPeaks(draft);
        break;
      case "toggleSamples":
        draft.samplesOpen = !draft.samplesOpen;
        break;
      case "toggleMetabolites":
        draft.metabolitesOpen = !draft.metabolitesOpen;
        break;
      case "toggleInspect":
        draft.inspectOpen = !draft.inspectOpen;
        break;
      case "setMinIntensity":
        if (action.value === draft.minIntensity) break;
        draft.minIntensity = action.value;
        forgetPeaks(draft);
        break;
      case "setMinIntegral":
        if (action.value === draft.minIntegral) break;
        draft.minIntegral = action.value;
        forgetPeaks(draft);
        break;
      case "setMinWidth":
        if (action.value === draft.minWidth) break;
        draft.minWidth = action.value;
        forgetPeaks(draft);
        break;
      case "setMinSnr":
        if (action.value === draft.minSnr) break;
        draft.minSnr = action.value;
        forgetPeaks(draft);
        break;
      case "toggleAutoNoise":
        draft.autoNoise = !draft.autoNoise;
        forgetPeaks(draft);
        break;
      case "toggleAutoBaseline":
        draft.autoBaseline = !draft.autoBaseline;
        forgetPeaks(draft);
        break;
      case "toggleAllowOverlap":
        draft.allowOverlap = !draft.allowOverlap;
        forgetPeaks(draft);
        break;
      case "toggleAnnotate":
        draft.annotate = !draft.annotate;
        break;
      case "toggleDisplayBaseline":
        draft.displayBaseline = !draft.displayBaseline;
        break;
      case "toggleAutoPeakPicking":
        draft.autoPeakPicking = !draft.autoPeakPicking;
        break;
      case "setRtFrom":
        if (action.value === draft.rtFrom) break;
        draft.rtFrom = action.value;
        forgetPeaks(draft);
        break;
      case "setRtTo":
        if (action.value === draft.rtTo) break;
        draft.rtTo = action.value;
        forgetPeaks(draft);
        break;
      case "setRtRange":
        if (action.from === draft.rtFrom && action.to === draft.rtTo) break;
        draft.rtFrom = action.from;
        draft.rtTo = action.to;
        forgetPeaks(draft);
        break;
      case "setPpm":
        if (action.value === draft.ppm) break;
        draft.ppm = action.value;
        forgetPeaks(draft);
        break;
      case "setMzTol":
        if (action.value === draft.mzTol) break;
        draft.mzTol = action.value;
        forgetPeaks(draft);
        break;
      case "setSamplesWidth":
        draft.samplesWidth = clampPanelWidth(action.value);
        break;
      case "setMetabolitesWidth":
        draft.metabolitesWidth = clampPanelWidth(action.value);
        break;
      case "samplesLoaded":
        draft.samples = {
          path: action.path,
          status: "ok",
          entries: action.entries,
        };
        break;
      case "samplesFailed":
        draft.samples = {
          path: action.path,
          status: "error",
          message: action.message,
        };
        break;
      case "fileOpened":
        draft.files[action.url] = { url: action.url, status: "ok" };
        break;
      case "fileFailed":
        draft.files[action.url] = {
          url: action.url,
          status: "error",
          message: action.message,
        };
        break;
      case "fileClosed":
        delete draft.files[action.url];
        delete draft.outcomes[action.url];
        break;
      case "eicReady":
        draft.outcomes[action.url] = {
          key: action.key,
          status: "ok",
          points: action.points,
        };
        break;
      case "eicFailed":
        draft.outcomes[action.url] = {
          key: action.key,
          status: "error",
          message: action.message,
        };
        break;
      case "peakFound":
        draft.peaksByKey[action.key] = action.peak;
        break;
      case "compoundsLoaded":
        draft.compoundSet = { id: action.id, status: "ok", list: action.list };
        break;
      case "compoundsFailed":
        draft.compoundSet = {
          id: action.id,
          status: "error",
          message: action.message,
        };
        break;
      case "addCompound": {
        const list = getWorkingList(draft);
        list.unshift(action.compound);
        break;
      }
      case "updateCompound": {
        const list = getWorkingList(draft);
        const at = list.findIndex((compound) => compound.label === action.original);
        if (at === -1) break;
        list[at] = action.compound;
        if (draft.pickedLabel === action.original) {
          draft.pickedLabel = action.compound.label;
          draft.pickedMz = action.compound.mz;
          draft.targetRt = action.compound.rt;
          draft.mzText = String(action.compound.mz);
        }
        break;
      }
      case "removeCompound": {
        const list = getWorkingList(draft);
        const at = list.findIndex((compound) => compound.label === action.label);
        if (at === -1) break;
        list.splice(at, 1);
        if (draft.pickedLabel === action.label) {
          draft.pickedLabel = null;
          draft.targetRt = null;
        }
        break;
      }
      case "replaceCompounds": {
        const id = getDatasetId(draft);
        draft.compoundEdits[id] = action.list;
        if (draft.pickedLabel !== null) {
          const stillThere = action.list.some(
            (compound) => compound.label === draft.pickedLabel,
          );
          if (!stillThere) {
            draft.pickedLabel = null;
            draft.targetRt = null;
          }
        }
        break;
      }
      case "uploadStarted":
        draft.uploadStatus = { status: "reading" };
        break;
      case "uploadFailed":
        draft.uploadStatus = { status: "error", message: action.message };
        break;
    }
  });
}

export type PeakSettings = Pick<
  State,
  | "minIntensity"
  | "minIntegral"
  | "minWidth"
  | "minSnr"
  | "autoNoise"
  | "autoBaseline"
  | "allowOverlap"
>;

export function peakOptions(settings: PeakSettings): PeakOptions {
  return {
    minIntensity: settings.minIntensity,
    minIntegral: settings.minIntegral,
    minPeakWidthPoints: settings.minWidth,
    minSnr: settings.minSnr,
    autoNoise: settings.autoNoise,
    autoBaseline: settings.autoBaseline,
    allowOverlap: settings.allowOverlap,
  };
}

export type EicSettings = Pick<State, "rtFrom" | "rtTo" | "ppm" | "mzTol">;

export function eicKey(
  url: string,
  mz: number,
  settings: EicSettings,
): string {
  return `${url}|${mz}|${settings.rtFrom}|${settings.rtTo}|${settings.ppm}|${settings.mzTol}`;
}

export function peakKey(
  url: string,
  mz: number,
  settings: EicSettings,
  rt: number | null,
  window: number,
): string {
  return `${eicKey(url, mz, settings)}|${rt}|${window}`;
}

export function readMz(value: string): number | null {
  const mz = Number(value);
  return Number.isFinite(mz) && mz > 0 ? mz : null;
}

export function readError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function activePath(state: State): string {
  return state.path;
}

export function datasetPath(state: Pick<State, "path" | "folderStack">): string {
  return state.folderStack[0] ?? state.path;
}

const emptyNames: string[] = [];
const emptyEntries: Entry[] = [];
const emptyPoints: Point[] = [];
const emptyUrls: string[] = [];
const emptyTraces: Trace[] = [];
const emptyCompounds: Compound[] = [];

export type TraceStatus = "idle" | "loading" | "ready" | "failed";

export interface Trace {
  sample: string;
  url: string;
  color: string;
  main: boolean;
  status: TraceStatus;
  points: Point[];
  message?: string;
}

export type SelectionInput = Pick<
  State,
  "path" | "samples" | "pickedSample" | "addedSamples"
>;

export type TraceInput = SelectionInput &
  EicSettings &
  Pick<State, "pickedMz" | "files" | "outcomes">;

function readEntries(input: SelectionInput): Entry[] {
  if (input.samples?.path !== input.path) return emptyEntries;
  if (input.samples.status !== "ok") return emptyEntries;
  return input.samples.entries ?? emptyEntries;
}

function readSampleEntries(input: SelectionInput): Entry[] {
  return readEntries(input).filter((entry) => entry.kind === "sample");
}

function readNames(input: SelectionInput): string[] {
  const found = readSampleEntries(input);
  return found.length === 0 ? emptyNames : found.map((entry) => entry.name);
}

function readUrls(input: SelectionInput): Map<string, string> {
  const urls = new Map<string, string>();
  for (const entry of readSampleEntries(input)) urls.set(entry.name, entry.url);
  return urls;
}

function readMainSample(input: SelectionInput, names: string[]): string | null {
  if (input.pickedSample && names.includes(input.pickedSample)) {
    return input.pickedSample;
  }
  return names[0] ?? null;
}

function readShownSamples(
  input: SelectionInput,
  names: string[],
  main: string,
): AddedSample[] {
  const shown: AddedSample[] = [{ name: main, styleIndex: 0 }];
  for (const added of input.addedSamples) {
    if (added.name === main) continue;
    if (!names.includes(added.name)) continue;
    shown.push(added);
  }
  return shown;
}

function readTraceStatus(
  mz: number | null,
  file: FileState | undefined,
  outcome: Outcome | undefined,
): TraceStatus {
  if (mz === null) return "idle";
  if (file?.status === "error") return "failed";
  if (outcome?.status === "error") return "failed";
  if (outcome?.status === "ok") return "ready";
  return "loading";
}

export function selectSampleNames(
  input: Pick<State, "path" | "samples">,
): Record<string, string> {
  const names: Record<string, string> = {};
  for (const entry of readSampleEntries(input as SelectionInput)) {
    names[entry.url] = entry.name;
  }
  return names;
}

export function selectOpenUrls(input: SelectionInput): string[] {
  const names = readNames(input);
  const main = readMainSample(input, names);
  if (!main) return emptyUrls;
  const urls = readUrls(input);
  const found: string[] = [];
  for (const shown of readShownSamples(input, names, main)) {
    const url = urls.get(shown.name);
    if (url) found.push(url);
  }
  return found;
}

export function selectTraces(input: TraceInput): Trace[] {
  const names = readNames(input);
  const main = readMainSample(input, names);
  if (!main) return emptyTraces;
  const urls = readUrls(input);
  const mz = input.pickedMz;

  return readShownSamples(input, names, main).map((shown) => {
    const url = urls.get(shown.name) ?? "";
    const file = input.files[url];
    const stored = input.outcomes[url];
    const outcome =
      mz !== null && stored?.key === eicKey(url, mz, input) ? stored : undefined;
    return {
      sample: shown.name,
      url,
      color: traceColor(shown.styleIndex),
      main: shown.name === main,
      status: readTraceStatus(mz, file, outcome),
      points: outcome?.points ?? emptyPoints,
      message: file?.status === "error" ? file.message : outcome?.message,
    };
  });
}

export function selectSamplePeaks(
  traces: Trace[],
  peaksByKey: Record<string, Peak>,
  mz: number | null,
  settings: EicSettings,
  targetRt: number | null,
  targetRtWindow: number,
): SamplePeaks[] {
  if (mz === null) return [];
  return traces.map((trace) => {
    const key = peakKey(trace.url, mz, settings, targetRt, targetRtWindow);
    const found = peaksByKey[key];
    return {
      sample: trace.sample,
      color: trace.color,
      main: trace.main,
      peak: found ?? emptyPeak,
      ready: found !== undefined,
    };
  });
}

export interface View {
  samplesReady: boolean;
  samplesFailed: boolean;
  samplesLoading: boolean;
  samples: string[];
  folders: Entry[];
  samplesMessage?: string;
  mainSample: string | null;
  mainUrl: string | null;
  mainKey: string | null;
  mainPoints: Point[];
  mainReady: boolean;
  mz: number | null;
}

export function selectView(state: State): View {
  const path = activePath(state);
  const samplesAtPath = state.samples?.path === path;
  const samplesReady = Boolean(samplesAtPath && state.samples?.status === "ok");
  const samplesFailed = Boolean(
    samplesAtPath && state.samples?.status === "error",
  );
  const samplesLoading = !samplesReady && !samplesFailed;
  const entries = samplesReady ? readEntries(state) : emptyEntries;
  const samples = samplesReady ? readNames(state) : emptyNames;
  const folders = samplesReady
    ? entries.filter((entry) => entry.kind === "folder")
    : emptyEntries;

  const mainSample = readMainSample(state, samples);
  const mainUrl = mainSample ? (readUrls(state).get(mainSample) ?? null) : null;

  const mz = state.pickedMz;
  const mainKey =
    mainUrl !== null && mz !== null ? eicKey(mainUrl, mz, state) : null;
  const stored = mainUrl === null ? undefined : state.outcomes[mainUrl];
  const outcome =
    mainKey !== null && stored?.key === mainKey ? stored : undefined;
  const mainReady = outcome?.status === "ok";
  const mainPoints = outcome?.points ?? emptyPoints;

  return {
    samplesReady,
    samplesFailed,
    samplesLoading,
    samples,
    folders,
    samplesMessage: state.samples?.message,
    mainSample,
    mainUrl,
    mainKey,
    mainPoints,
    mainReady,
    mz,
  };
}

export interface CompoundView {
  id: string;
  label: string;
  list: Compound[];
  loading: boolean;
  failed: boolean;
  message?: string;
}

export function selectCompounds(
  state: Pick<State, "path" | "folderStack" | "compoundSet" | "compoundEdits">,
): CompoundView {
  const dataset = findDataset(datasetPath(state));
  const loaded =
    state.compoundSet?.id === dataset.id ? state.compoundSet : null;
  const edited = state.compoundEdits[dataset.id];
  const list = edited ?? (loaded?.status === "ok" ? loaded.list : undefined);
  return {
    id: dataset.id,
    label: dataset.label,
    list: list ?? emptyCompounds,
    loading: edited === undefined && loaded === null,
    failed: edited === undefined && loaded?.status === "error",
    message: loaded?.message,
  };
}
