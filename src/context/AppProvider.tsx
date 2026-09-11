import { useEffect, useReducer, type ReactNode } from "react";
import { findDataset } from "../data/datasets";
import { getTruthSet } from "../data/truthSet";
import { getSamples } from "../ms/listSamples";
import { getTargetPeak } from "../ms/peaks";
import { writePaths } from "../utilities/savedPaths";
import { watchWideScreen } from "../utilities/screen";
import { DispatchContext, StateContext } from "./context";
import { SampleLoader } from "./SampleLoader";
import { useOpenUrls, useSampleNames, useTraces } from "./useTraces";
import {
  activePath,
  datasetPath,
  initialState,
  peakKey,
  peakOptions,
  readError,
  reducer,
  selectView,
} from "./reducer";

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const { samples, savedPaths, compoundSet } = state;
  const dataset = findDataset(datasetPath(state));

  useEffect(() => {
    writePaths(savedPaths);
  }, [savedPaths]);

  useEffect(
    () => watchWideScreen((wide) => dispatch({ type: "setWideScreen", wide })),
    [],
  );

  const {
    rtFrom,
    rtTo,
    ppm,
    mzTol,
    autoPeakPicking,
    minIntensity,
    minIntegral,
    minWidth,
    minSnr,
    autoNoise,
    autoBaseline,
    allowOverlap,
    targetRt,
    targetRtWindow,
  } = state;
  const path = activePath(state);
  const { mz } = selectView(state);
  const openUrls = useOpenUrls(state);
  const sampleNames = useSampleNames(state);
  const traces = useTraces(state);
  const { peaksByKey } = state;

  useEffect(() => {
    if (samples && samples.path === path) return undefined;
    if (path.trim().length === 0) {
      dispatch({ type: "samplesLoaded", path, entries: [] });
      return undefined;
    }
    let active = true;
    getSamples(path)
      .then((entries) => {
        if (active) dispatch({ type: "samplesLoaded", path, entries });
      })
      .catch((error: unknown) => {
        if (active)
          dispatch({ type: "samplesFailed", path, message: readError(error) });
      });
    return () => {
      active = false;
    };
  }, [path, samples]);

  useEffect(() => {
    dispatch({
      type: "setRtRange",
      from: dataset.rtRange.from,
      to: dataset.rtRange.to,
    });
  }, [dataset.id, dataset.rtRange.from, dataset.rtRange.to]);

  useEffect(() => {
    if (compoundSet?.id === dataset.id) return undefined;
    if (!dataset.file) {
      dispatch({
        type: "compoundsLoaded",
        id: dataset.id,
        list: dataset.list ?? [],
      });
      return undefined;
    }
    let active = true;
    getTruthSet(dataset)
      .then((list) => {
        if (active) dispatch({ type: "compoundsLoaded", id: dataset.id, list });
      })
      .catch((error: unknown) => {
        if (active)
          dispatch({
            type: "compoundsFailed",
            id: dataset.id,
            message: readError(error),
          });
      });
    return () => {
      active = false;
    };
  }, [dataset, compoundSet]);

  useEffect(() => {
    if (!autoPeakPicking || mz === null) return;
    const options = peakOptions({
      minIntensity,
      minIntegral,
      minWidth,
      minSnr,
      autoNoise,
      autoBaseline,
      allowOverlap,
    });
    for (const trace of traces) {
      if (trace.status !== "ready") continue;
      const key = peakKey(trace.url, mz, { rtFrom, rtTo, ppm, mzTol }, targetRt, targetRtWindow);
      if (peaksByKey[key] !== undefined) continue;
      const peak = getTargetPeak(trace.points, targetRt, targetRtWindow, options);
      dispatch({ type: "peakFound", key, peak });
    }
  }, [
    autoPeakPicking,
    traces,
    mz,
    rtFrom,
    rtTo,
    ppm,
    mzTol,
    peaksByKey,
    targetRt,
    targetRtWindow,
    minIntensity,
    minIntegral,
    minWidth,
    minSnr,
    autoNoise,
    autoBaseline,
    allowOverlap,
  ]);

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {openUrls.map((url) => (
          <SampleLoader
            key={url}
            url={url}
            name={sampleNames[url] ?? url}
            mz={mz}
            rtFrom={rtFrom}
            rtTo={rtTo}
            ppm={ppm}
            mzTol={mzTol}
            dispatch={dispatch}
          />
        ))}
        {children}
      </DispatchContext.Provider>
    </StateContext.Provider>
  );
}
