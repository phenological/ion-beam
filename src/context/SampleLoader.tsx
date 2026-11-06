import { memo, useEffect, useRef, useState, type Dispatch } from "react";
import { closeFile, openFile, readEic } from "../ms/ionClient";
import { endQuery, startQuery } from "../ms/queryTimer";
import { eicKey, readError, type Action } from "./reducer";

interface EicSettingsProps {
  rtFrom: number;
  rtTo: number;
  ppm: number;
  mzTol: number;
}

interface SampleLoaderProps extends EicSettingsProps {
  url: string;
  name: string;
  mzs: number[];
  dispatch: Dispatch<Action>;
}

interface EicLoaderProps extends EicSettingsProps {
  url: string;
  mz: number;
  dispatch: Dispatch<Action>;
}

const EicLoader = memo(function EicLoader({
  url,
  mz,
  rtFrom,
  rtTo,
  ppm,
  mzTol,
  dispatch,
}: EicLoaderProps) {
  const startedKey = useRef<string | null>(null);

  useEffect(() => {
    const key = eicKey(url, mz, { rtFrom, rtTo, ppm, mzTol });
    if (startedKey.current === key) return;
    startedKey.current = key;
    startQuery();
    readEic(url, mz, { from: rtFrom, to: rtTo }, ppm, mzTol)
      .finally(endQuery)
      .then((points) => {
        dispatch({ type: "eicReady", url, key, points });
      })
      .catch((error: unknown) => {
        dispatch({ type: "eicFailed", url, key, message: readError(error) });
      });
  }, [mz, url, rtFrom, rtTo, ppm, mzTol, dispatch]);

  return null;
});

export const SampleLoader = memo(function SampleLoader({
  url,
  name,
  mzs,
  rtFrom,
  rtTo,
  ppm,
  mzTol,
  dispatch,
}: SampleLoaderProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let live = true;
    startQuery();
    openFile(url, name)
      .finally(endQuery)
      .then(() => {
        if (!live) return;
        setReady(true);
        dispatch({ type: "fileOpened", url });
      })
      .catch((error: unknown) => {
        if (live) {
          dispatch({ type: "fileFailed", url, message: readError(error) });
        }
      });
    return () => {
      live = false;
      setReady(false);
      closeFile(url);
      dispatch({ type: "fileClosed", url });
    };
  }, [url, name, dispatch]);

  if (!ready) return null;
  return mzs.map((mz) => (
    <EicLoader
      key={mz}
      url={url}
      mz={mz}
      rtFrom={rtFrom}
      rtTo={rtTo}
      ppm={ppm}
      mzTol={mzTol}
      dispatch={dispatch}
    />
  ));
});
