import { useEffect, useState } from "react";
import { annotateFeature } from "../ms/ionClient";
import { librarySource, matchCount, modelSource } from "../ms/annotationSources";
import type { FeatureMatches, LibraryMatch, ScanData } from "../ms/workerMessages";
import type { SpectrumLine, SpectrumPanel, SpectrumTarget } from "./useSpectra";

const sampleColor = "#2563eb";
const libraryColor = "#dc2626";

export interface AnnotationState {
  status: "idle" | "loading" | "ready" | "failed";
  key: string;
  result: FeatureMatches | null;
  message?: string;
}

const idle: AnnotationState = { status: "idle", key: "", result: null };
const storedResults = new Map<string, Promise<FeatureMatches>>();

function getStoredResult(key: string, target: SpectrumTarget, rt: number): Promise<FeatureMatches> {
  const stored = storedResults.get(key);
  if (stored) return stored;
  const sources = { library: librarySource, model: modelSource, matches: matchCount };
  const request = annotateFeature(target.main.url, target.mz, rt, sources);
  storedResults.set(key, request);
  request.catch(() => storedResults.delete(key));
  return request;
}

function getRequestKey(enabled: boolean, target: SpectrumTarget | null): string {
  if (!enabled || !target || target.rt === null) return "";
  return `${target.main.url}|${target.mz}|${target.rt}`;
}

export function useAnnotation(enabled: boolean, target: SpectrumTarget | null): AnnotationState {
  const [loaded, setLoaded] = useState<AnnotationState>(idle);
  const key = getRequestKey(enabled, target);

  useEffect(() => {
    if (!key || !target || target.rt === null) return;
    let isCurrent = true;
    getStoredResult(key, target, target.rt)
      .then((result) => {
        if (isCurrent) setLoaded({ status: "ready", key, result });
      })
      .catch((error: unknown) => {
        if (isCurrent) setLoaded({ status: "failed", key, result: null, message: String(error instanceof Error ? error.message : error) });
      });
    return () => {
      isCurrent = false;
    };
  }, [key, target]);

  if (!key) return idle;
  if (loaded.key !== key) return { status: "loading", key, result: null };
  return loaded;
}

function toScaledPoints(mz: Float64Array, intensity: Float64Array, sign: number) {
  let highest = 0;
  for (const value of intensity) highest = Math.max(highest, value);
  const points = [];
  for (let index = 0; index < mz.length; index += 1) {
    points.push({ x: mz[index], y: highest > 0 ? (sign * 100 * intensity[index]) / highest : 0 });
  }
  return points;
}

export function buildMirrorPanel(query: ScanData | null, match: LibraryMatch): SpectrumPanel {
  const lines: SpectrumLine[] = [];
  if (query) lines.push({ id: "sample", color: sampleColor, points: toScaledPoints(query.mz, query.intensity, 1) });
  lines.push({ id: "library", color: libraryColor, points: toScaledPoints(match.mz, match.intensity, -1) });
  return {
    status: "ready",
    label: `MS2 · sample (up) vs ${match.label}, ${match.database} (down)`,
    lines,
    markMz: null,
    precursorMz: query?.precursorMz ?? null,
  };
}
