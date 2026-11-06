import { produce } from "immer";
import type { FindPeaksOptions } from "quantion";
import type { Point } from "../ms/eic";
import { emptyPeak, type Peak } from "../ms/peaks";
import type { Compound } from "../data/compounds";
import { findDataset } from "../data/datasets";
import { defaultMz, defaultPaths, defaultRtWindow } from "../data/targets";
import { readPaths } from "../utilities/savedPaths";
import { readPanels, type PanelName, type ShownPanels } from "../utilities/savedPanels";
import { isWideScreen } from "../utilities/screen";
import type { Entry } from "../ms/listSamples";
import type { ZipProgress } from "../ms/zipClient";

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

export interface AddedCompound {
  compound: Compound;
  styleIndex: number;
}

export interface State {
  path: string;
  savedPaths: string[];
  folderStack: string[];
  pickedSample: string | null;
  addedSamples: AddedSample[];
  addedCompounds: AddedCompound[];
  mzText: string;
  pickedMz: number | null;
  pickedLabel: string | null;
  targetRt: number | null;
  targetRtWindow: number;
  wideScreen: boolean;
  samplesOpen: boolean;
  metabolitesOpen: boolean;
  inspectOpen: boolean;
  shownPanels: ShownPanels;
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
  outcomes: Record<string, Record<string, Outcome>>;
  peaksByKey: Record<string, Peak>;
  compoundSet: CompoundSet | null;
  compoundEdits: Record<string, Compound[]>;
  uploadStatus:
    | { status: "reading"; progress: ZipProgress | null }
    | { status: "error"; message: string }
    | null;
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
  addedCompounds: [],
  mzText: String(defaultMz),
  pickedMz: null,
  pickedLabel: null,
  targetRt: null,
  targetRtWindow: defaultRtWindow,
  wideScreen: startsWide,
  samplesOpen: startsWide,
  metabolitesOpen: startsWide,
  inspectOpen: false,
  shownPanels: readPanels(),
  samplesWidth: 300,
  metabolitesWidth: 320,
  minIntensity: 500,
  minIntegral: 0,
  minWidth: 2,
  minSnr: 2,
  autoNoise: true,
  autoBaseline: true,
  allowOverlap: false,
  annotate: false,
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
  | { type: "toggleCompound"; compound: Compound }
  | { type: "setWideScreen"; wide: boolean }
  | { type: "toggleSamples" }
  | { type: "toggleMetabolites" }
  | { type: "toggleInspect" }
  | { type: "togglePanel"; name: PanelName }
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
  | { type: "uploadProgress"; progress: ZipProgress }
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

function findFreeStyle(added: { styleIndex: number }[]): number {
  const taken = new Set(added.map((item) => item.styleIndex));
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

function readWantedMzs(input: Pick<State, "pickedMz" | "addedCompounds">): number[] {
  const mzs = new Set<number>();
  if (input.pickedMz !== null) mzs.add(input.pickedMz);
  for (const added of input.addedCompounds) mzs.add(added.compound.mz);
  return [...mzs];
}

function storeOutcome(draft: State, url: string, outcome: Outcome): void {
  const wantedKeys = new Set(readWantedMzs(draft).map((mz) => eicKey(url, mz, draft)));
  if (!wantedKeys.has(outcome.key)) return;
  const stored = draft.outcomes[url] ?? {};
  for (const key of Object.keys(stored)) {
    if (!wantedKeys.has(key)) delete stored[key];
  }
  stored[outcome.key] = outcome;
  draft.outcomes[url] = stored;
}

function keepListedCompounds(added: AddedCompound[], list: Compound[]): AddedCompound[] {
  const byLabel = new Map(list.map((compound) => [compound.label, compound]));
  const kept: AddedCompound[] = [];
  for (const item of added) {
    const compound = byLabel.get(item.compound.label);
    if (compound) kept.push({ compound, styleIndex: item.styleIndex });
  }
  return kept;
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
        draft.addedCompounds = [];
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
        draft.addedCompounds = [];
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
        draft.addedCompounds = [];
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
        draft.addedCompounds = [];
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
        draft.addedCompounds = [];
        const styleIndex = findFreeStyle(draft.addedSamples);
        draft.addedSamples.push({ name: action.name, styleIndex });
        break;
      }
      case "toggleCompound": {
        if (action.compound.label === draft.pickedLabel) break;
        const at = draft.addedCompounds.findIndex(
          (added) => added.compound.label === action.compound.label,
        );
        if (at !== -1) {
          draft.addedCompounds.splice(at, 1);
          break;
        }
        draft.addedSamples = [];
        const styleIndex = findFreeStyle(draft.addedCompounds);
        draft.addedCompounds.push({ compound: action.compound, styleIndex });
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
        draft.addedCompounds = draft.addedCompounds.filter(
          (added) => added.compound.label !== action.compound.label,
        );
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
      case "togglePanel":
        draft.shownPanels[action.name] = !draft.shownPanels[action.name];
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
        storeOutcome(draft, action.url, {
          key: action.key,
          status: "ok",
          points: action.points,
        });
        break;
      case "eicFailed":
        storeOutcome(draft, action.url, {
          key: action.key,
          status: "error",
          message: action.message,
        });
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
        const added = draft.addedCompounds.find(
          (item) => item.compound.label === action.original,
        );
        if (added) added.compound = action.compound;
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
        draft.addedCompounds = draft.addedCompounds.filter(
          (item) => item.compound.label !== action.label,
        );
        if (draft.pickedLabel === action.label) {
          draft.pickedLabel = null;
          draft.targetRt = null;
        }
        break;
      }
      case "replaceCompounds": {
        const id = getDatasetId(draft);
        draft.compoundEdits[id] = action.list;
        draft.addedCompounds = keepListedCompounds(draft.addedCompounds, action.list);
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
        draft.uploadStatus = { status: "reading", progress: null };
        break;
      case "uploadProgress":
        draft.uploadStatus = { status: "reading", progress: action.progress };
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

export function peakOptions(settings: PeakSettings): FindPeaksOptions {
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
const emptyRequests: EicRequest[] = [];
const emptyTraces: Trace[] = [];
const emptyCompounds: Compound[] = [];

export type TraceStatus = "idle" | "loading" | "ready" | "failed";

export interface Trace {
  id: string;
  name: string;
  sample: string;
  compound: Compound | null;
  url: string;
  mz: number | null;
  rt: number | null;
  rtWindow: number;
  color: string;
  main: boolean;
  status: TraceStatus;
  points: Point[];
  message?: string;
}

export interface EicRequest {
  url: string;
  mzs: number[];
}

export type SelectionInput = Pick<
  State,
  "path" | "samples" | "pickedSample" | "addedSamples" | "addedCompounds" | "pickedMz"
>;

export type TraceInput = SelectionInput &
  EicSettings &
  Pick<State, "pickedLabel" | "targetRt" | "targetRtWindow" | "files" | "outcomes">;

interface Target {
  name: string;
  mz: number | null;
  rt: number | null;
  rtWindow: number;
}

interface TracePiece {
  url: string;
  sample: string;
  compound: Compound | null;
  name: string;
  target: Target;
  styleIndex: number;
  main: boolean;
}

function readEntries(input: Pick<State, "path" | "samples">): Entry[] {
  if (input.samples?.path !== input.path) return emptyEntries;
  if (input.samples.status !== "ok") return emptyEntries;
  return input.samples.entries ?? emptyEntries;
}

function readSampleEntries(input: Pick<State, "path" | "samples">): Entry[] {
  return readEntries(input).filter((entry) => entry.kind === "sample");
}

function readNames(input: Pick<State, "path" | "samples">): string[] {
  const found = readSampleEntries(input);
  return found.length === 0 ? emptyNames : found.map((entry) => entry.name);
}

function readUrls(input: Pick<State, "path" | "samples">): Map<string, string> {
  const urls = new Map<string, string>();
  for (const entry of readSampleEntries(input)) urls.set(entry.name, entry.url);
  return urls;
}

function readMainSample(
  input: Pick<State, "pickedSample">,
  names: string[],
): string | null {
  if (input.pickedSample && names.includes(input.pickedSample)) {
    return input.pickedSample;
  }
  return names[0] ?? null;
}

function readShownSamples(
  input: Pick<State, "addedSamples">,
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

function readMainTarget(input: TraceInput): Target {
  const mz = input.pickedMz;
  return {
    name: input.pickedLabel ?? (mz === null ? "no metabolite" : `m/z ${mz}`),
    mz,
    rt: input.targetRt,
    rtWindow: input.targetRtWindow,
  };
}

function readCompoundTarget(compound: Compound): Target {
  return {
    name: compound.label,
    mz: compound.mz,
    rt: compound.rt,
    rtWindow: compound.sd ?? defaultRtWindow,
  };
}

function buildTrace(input: TraceInput, piece: TracePiece): Trace {
  const { url, target } = piece;
  const file = input.files[url];
  const outcome =
    target.mz === null ? undefined : input.outcomes[url]?.[eicKey(url, target.mz, input)];
  return {
    id: piece.compound ? `${url}|${piece.compound.label}` : url,
    name: piece.name,
    sample: piece.sample,
    compound: piece.compound,
    url,
    mz: target.mz,
    rt: target.rt,
    rtWindow: target.rtWindow,
    color: traceColor(piece.styleIndex),
    main: piece.main,
    status: readTraceStatus(target.mz, file, outcome),
    points: outcome?.points ?? emptyPoints,
    message: file?.status === "error" ? file.message : outcome?.message,
  };
}

export function selectSampleNames(
  input: Pick<State, "path" | "samples">,
): Record<string, string> {
  const names: Record<string, string> = {};
  for (const entry of readSampleEntries(input)) {
    names[entry.url] = entry.name;
  }
  return names;
}

export function selectEicRequests(input: SelectionInput): EicRequest[] {
  const names = readNames(input);
  const main = readMainSample(input, names);
  if (!main) return emptyRequests;
  const urls = readUrls(input);
  const mainMzs = input.pickedMz === null ? [] : [input.pickedMz];
  const requests: EicRequest[] = [];
  for (const shown of readShownSamples(input, names, main)) {
    const url = urls.get(shown.name);
    if (!url) continue;
    const mzs = shown.name === main ? readWantedMzs(input) : mainMzs;
    requests.push({ url, mzs });
  }
  return requests;
}

export function selectTraces(input: TraceInput): Trace[] {
  const names = readNames(input);
  const main = readMainSample(input, names);
  if (!main) return emptyTraces;
  const urls = readUrls(input);
  const showsCompounds = input.addedCompounds.length > 0;
  const mainTarget = readMainTarget(input);
  const traces: Trace[] = [];

  for (const shown of readShownSamples(input, names, main)) {
    traces.push(
      buildTrace(input, {
        url: urls.get(shown.name) ?? "",
        sample: shown.name,
        compound: null,
        name: showsCompounds ? mainTarget.name : shown.name,
        target: mainTarget,
        styleIndex: shown.styleIndex,
        main: shown.name === main,
      }),
    );
  }

  const mainUrl = urls.get(main) ?? "";
  for (const added of input.addedCompounds) {
    traces.push(
      buildTrace(input, {
        url: mainUrl,
        sample: main,
        compound: added.compound,
        name: added.compound.label,
        target: readCompoundTarget(added.compound),
        styleIndex: added.styleIndex,
        main: false,
      }),
    );
  }
  return traces;
}

export interface TracePeak {
  id: string;
  name: string;
  color: string;
  main: boolean;
  peak: Peak;
  ready: boolean;
}

export function tracePeakKey(trace: Trace, settings: EicSettings): string | null {
  if (trace.mz === null) return null;
  return peakKey(trace.url, trace.mz, settings, trace.rt, trace.rtWindow);
}

export function selectTracePeaks(
  traces: Trace[],
  peaksByKey: Record<string, Peak>,
  settings: EicSettings,
): TracePeak[] {
  const found: TracePeak[] = [];
  for (const trace of traces) {
    const key = tracePeakKey(trace, settings);
    if (key === null) continue;
    const peak = peaksByKey[key];
    found.push({
      id: trace.id,
      name: trace.name,
      color: trace.color,
      main: trace.main,
      peak: peak ?? emptyPeak,
      ready: peak !== undefined,
    });
  }
  return found;
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
  const outcome =
    mainUrl !== null && mainKey !== null ? state.outcomes[mainUrl]?.[mainKey] : undefined;
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
