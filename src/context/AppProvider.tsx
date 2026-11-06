import { useEffect, useReducer, type ReactNode } from "react";
import { findDataset } from "../data/datasets";
import { getTruthSet } from "../data/truthSet";
import { getSamples } from "../ms/listSamples";
import { getTargetPeak } from "../ms/peaks";
import { writePaths } from "../utilities/savedPaths";
import { writePanels } from "../utilities/savedPanels";
import { watchWideScreen } from "../utilities/screen";
import { DispatchContext, StateContext } from "./context";
import { SampleLoader } from "./SampleLoader";
import { useEicRequests, useSampleNames, useTraces } from "./useTraces";
import {
  activePath,
  datasetPath,
  initialState,
  peakOptions,
  readError,
  reducer,
  tracePeakKey,
} from "./reducer";

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const { samples, savedPaths, compoundSet, shownPanels } = state;
  const dataset = findDataset(datasetPath(state));

  useEffect(() => {
    writePaths(savedPaths);
  }, [savedPaths]);

  useEffect(() => {
    writePanels(shownPanels);
  }, [shownPanels]);

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
  } = state;
  const path = activePath(state);
  const eicRequests = useEicRequests(state);
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
    if (!autoPeakPicking) return;
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
      const key = tracePeakKey(trace, { rtFrom, rtTo, ppm, mzTol });
      if (key === null || peaksByKey[key] !== undefined) continue;
      const peak = getTargetPeak(trace.points, trace.rt, trace.rtWindow, options);
      dispatch({ type: "peakFound", key, peak });
    }
  }, [
    autoPeakPicking,
    traces,
    rtFrom,
    rtTo,
    ppm,
    mzTol,
    peaksByKey,
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
        {eicRequests.map((request) => (
          <SampleLoader
            key={request.url}
            url={request.url}
            name={sampleNames[request.url] ?? request.url}
            mzs={request.mzs}
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
