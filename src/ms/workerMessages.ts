import type { ScanQuery } from "quantion";
import type { Traffic } from "./traffic";

export interface ScanFilter {
  mzFrom?: number;
  mzTo?: number;
  precursorMz?: number;
  precursorTolerance?: number;
}

export interface ScanData {
  rt: number;
  precursorMz: number | null;
  mz: Float64Array;
  intensity: Float64Array;
}

export interface LibraryMatch {
  label: string;
  id: string;
  database: string;
  score: number;
  cosine: number;
  formula: string;
  smiles: string;
  mz: Float64Array;
  intensity: Float64Array;
}

export interface FeatureMatches {
  query: ScanData | null;
  matches: LibraryMatch[];
}

export type AskWorker =
  | { type: "open"; id: number; url: string; name: string; bytes?: ArrayBuffer }
  | {
      type: "eic";
      id: number;
      url: string;
      mz: number;
      from: number;
      to: number;
      ppm: number;
      mzTol: number;
    }
  | {
      type: "scans";
      id: number;
      url: string;
      query: ScanQuery;
      level: number;
      filter: ScanFilter;
    }
  | {
      type: "annotate";
      id: number;
      url: string;
      mz: number;
      rt: number;
      library: string;
      model: string;
      matches: number;
    }
  | { type: "close"; url: string };

export interface WorkerScope {
  postMessage(message: WorkerSays, transfer?: Transferable[]): void;
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<AskWorker>) => void,
  ): void;
}

export type WorkerSays =
  | { id: number; type: "opened" }
  | { id: number; type: "eic"; x: Float64Array; y: Float64Array }
  | { id: number; type: "scans"; scans: ScanData[] }
  | { id: number; type: "annotation"; annotation: FeatureMatches }
  | { id: number; type: "failed"; message: string }
  | { type: "traffic"; traffic: Traffic };
