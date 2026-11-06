import { useMemo } from "react";
import {
  selectEicRequests,
  selectSampleNames,
  selectTracePeaks,
  selectTraces,
  type EicRequest,
  type State,
  type Trace,
  type TracePeak,
} from "./reducer";

export function useEicRequests(state: State): EicRequest[] {
  const { path, samples, pickedSample, addedSamples, addedCompounds, pickedMz } = state;
  return useMemo(
    () =>
      selectEicRequests({
        path,
        samples,
        pickedSample,
        addedSamples,
        addedCompounds,
        pickedMz,
      }),
    [path, samples, pickedSample, addedSamples, addedCompounds, pickedMz],
  );
}

export function useSampleNames(state: State): Record<string, string> {
  const { path, samples } = state;
  return useMemo(() => selectSampleNames({ path, samples }), [path, samples]);
}

export function useTraces(state: State): Trace[] {
  const {
    path,
    samples,
    pickedSample,
    addedSamples,
    addedCompounds,
    pickedMz,
    pickedLabel,
    targetRt,
    targetRtWindow,
    rtFrom,
    rtTo,
    ppm,
    mzTol,
    files,
    outcomes,
  } = state;
  return useMemo(
    () =>
      selectTraces({
        path,
        samples,
        pickedSample,
        addedSamples,
        addedCompounds,
        pickedMz,
        pickedLabel,
        targetRt,
        targetRtWindow,
        rtFrom,
        rtTo,
        ppm,
        mzTol,
        files,
        outcomes,
      }),
    [
      path,
      samples,
      pickedSample,
      addedSamples,
      addedCompounds,
      pickedMz,
      pickedLabel,
      targetRt,
      targetRtWindow,
      rtFrom,
      rtTo,
      ppm,
      mzTol,
      files,
      outcomes,
    ],
  );
}

export function useTracePeaks(state: State, traces: Trace[]): TracePeak[] {
  const { peaksByKey, rtFrom, rtTo, ppm, mzTol } = state;
  return useMemo(
    () => selectTracePeaks(traces, peaksByKey, { rtFrom, rtTo, ppm, mzTol }),
    [traces, peaksByKey, rtFrom, rtTo, ppm, mzTol],
  );
}
