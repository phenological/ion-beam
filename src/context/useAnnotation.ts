import { useEffect, useState } from "react";
import { annotateFeature } from "../ms/ionClient";
import { findLibraries, matchCount, modelSource } from "../ms/annotationSources";
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

async function annotateInLibraries(url: string, mz: number, rt: number): Promise<FeatureMatches> {
  const libraries = await findLibraries(mz);
  const found = await Promise.all(
    libraries.map((library) => annotateFeature(url, mz, rt, { library, model: modelSource, matches: matchCount })),
  );
  const matches = found
    .flatMap((item) => item.matches)
    .sort((first, second) => second.score - first.score)
    .slice(0, matchCount);
  return { query: found.find((item) => item.query !== null)?.query ?? null, matches };
}

function getStoredResult(key: string, target: SpectrumTarget, rt: number): Promise<FeatureMatches> {
  const stored = storedResults.get(key);
  if (stored) return stored;
  const request = annotateInLibraries(target.main.url, target.mz, rt);
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

function toScaledPoints(mz: ArrayLike<number>, intensity: ArrayLike<number>, sign: number) {
  let highest = 0;
  for (let index = 0; index < intensity.length; index += 1) highest = Math.max(highest, intensity[index]);
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

export function addLibraryMatch(panel: SpectrumPanel, match: LibraryMatch): SpectrumPanel {
  if (panel.status !== "ready" || panel.lines.length === 0) return panel;
  const lines: SpectrumLine[] = panel.lines.map((line) => ({
    id: line.id,
    color: sampleColor,
    points: toScaledPoints(
      line.points.map((point) => point.x),
      line.points.map((point) => point.y),
      1,
    ),
  }));
  lines.push({ id: "library", color: libraryColor, points: toScaledPoints(match.mz, match.intensity, -1) });
  return { ...panel, label: `${panel.label} (up) vs ${match.label}, ${match.database} (down)`, lines };
}
