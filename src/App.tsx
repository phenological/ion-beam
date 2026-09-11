import { useMemo } from "react";
import { getTargetPeak } from "./ms/peaks";
import { getBaseline } from "./ms/baseline";
import { PathInput } from "./components/PathInput";
import { UploadButton } from "./components/UploadButton";
import { SampleList } from "./components/SampleList";
import { FolderList } from "./components/FolderList";
import { CompoundList } from "./components/CompoundList";
import { ConfigPanel } from "./components/ConfigPanel";
import { EicPlot } from "./components/EicPlot";
import { PeakTable } from "./components/PeakTable";
import { ResizeHandle } from "./components/ResizeHandle";
import { InspectPanel } from "./components/InspectPanel";
import { TraceLegend } from "./components/TraceLegend";
import { useAppDispatch, useAppState } from "./context/context";
import {
  activePath,
  peakKey,
  peakOptions,
  selectCompounds,
  selectView,
} from "./context/reducer";
import { useSamplePeaks, useTraces } from "./context/useTraces";
import "./App.css";

function headline(
  mainSample: string | null,
  label: string | null,
  mz: number | null,
  count: number,
): string {
  if (!mainSample) return "Pick a sample";
  const target = label ?? (mz === null ? "no metabolite" : `m/z ${mz}`);
  if (count < 2) return `${mainSample} · ${target}`;
  return `${count} samples · ${target}`;
}

function App() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const view = selectView(state);
  const metabolites = selectCompounds(state);
  const traces = useTraces(state);
  const samplePeaks = useSamplePeaks(state, traces);

  const sampleColors = useMemo(() => {
    const colors: Record<string, string> = {};
    for (const trace of traces) colors[trace.sample] = trace.color;
    return colors;
  }, [traces]);

  const baseline = useMemo(
    () =>
      state.displayBaseline && view.mainReady ? getBaseline(view.mainPoints) : null,
    [state.displayBaseline, view.mainReady, view.mainPoints],
  );

  const annotateRt = state.annotate && state.targetRt !== null ? state.targetRt : null;
  const mainTrace = traces.find((trace) => trace.main) ?? null;
  const mainPeak = samplePeaks.find((group) => group.main)?.peak ?? null;

  function runPeakPicking() {
    if (view.mz === null) return;
    const options = peakOptions(state);
    for (const trace of traces) {
      if (trace.status !== "ready") continue;
      const key = peakKey(trace.url, view.mz, state, state.targetRt, state.targetRtWindow);
      const peak = getTargetPeak(trace.points, state.targetRt, state.targetRtWindow, options);
      dispatch({ type: "peakFound", key, peak });
    }
  }

  const anySheetOpen = state.samplesOpen || state.metabolitesOpen;

  function closeSheets() {
    if (state.samplesOpen) dispatch({ type: "toggleSamples" });
    if (state.metabolitesOpen) dispatch({ type: "toggleMetabolites" });
  }

  return (
    <div className={state.wideScreen ? "app" : "app narrow"}>
      {anySheetOpen && (
        <button
          type="button"
          className="sheet-backdrop"
          aria-label="Close the panel"
          onClick={closeSheets}
        />
      )}
      <aside
        className={state.samplesOpen ? "sidebar left" : "sidebar left closed"}
        style={
          state.wideScreen && state.samplesOpen
            ? { width: state.samplesWidth }
            : undefined
        }
      >
        <div className="sidebar-head">
          {state.samplesOpen && <span className="sidebar-label">Samples</span>}
          {state.samplesOpen && (
            <span className="sidebar-count">{view.samples.length}</span>
          )}
          {state.samplesOpen && <UploadButton />}
          <button
            type="button"
            className="sidebar-toggle"
            title={state.samplesOpen ? "Hide samples" : "Show samples"}
            onClick={() => dispatch({ type: "toggleSamples" })}
          >
            {state.samplesOpen ? "‹" : "›"}
          </button>
        </div>
        {state.samplesOpen && (
          <div className="sidebar-body">
            {state.uploadStatus?.status === "reading" && (
              <p className="banner">Reading the zip…</p>
            )}
            {state.uploadStatus?.status === "error" && (
              <p className="banner banner-error">
                Could not read the zip: {state.uploadStatus.message}
              </p>
            )}
            {view.samplesFailed && (
              <p className="banner banner-error">Could not list samples: {view.samplesMessage}</p>
            )}
            {view.samplesLoading && <p className="banner">Loading samples…</p>}
            {!view.samplesLoading && !view.samplesFailed && (
              <>
                <FolderList
                  folders={view.folders}
                  canGoUp={state.folderStack.length > 0}
                />
                <SampleList
                  samples={view.samples}
                  mainSample={view.mainSample}
                  sampleColors={sampleColors}
                />
              </>
            )}
          </div>
        )}
      </aside>

      {state.samplesOpen && (
        <ResizeHandle
          onResize={(cursorX) => dispatch({ type: "setSamplesWidth", value: cursorX })}
        />
      )}

      <main className="content">
        <header className="content-head">
          <div className="content-head-text">
            <h1 className="content-title">Displayer</h1>
            <p className="content-sub" title={traces.map((trace) => trace.sample).join(", ")}>
              {headline(view.mainSample, state.pickedLabel, view.mz, traces.length)}
            </p>
          </div>
          {!state.autoPeakPicking && (
            <button
              type="button"
              className="run-button"
              disabled={!view.mainReady}
              onClick={runPeakPicking}
            >
              ▶ Run peak picking
            </button>
          )}
          <div className="sheet-buttons">
            <button
              type="button"
              className="sheet-button"
              onClick={() => dispatch({ type: "toggleSamples" })}
            >
              Samples
              <span className="sheet-button-count">{view.samples.length}</span>
            </button>
            <button
              type="button"
              className="sheet-button"
              onClick={() => dispatch({ type: "toggleMetabolites" })}
            >
              Metabolites
              <span className="sheet-button-count">{metabolites.list.length}</span>
            </button>
          </div>
        </header>

        <div className="content-path">
          <PathInput path={activePath(state)} saved={state.savedPaths} />
        </div>

        <div className="content-body">
          {view.mainSample && (
            <section className="plot-card">
              {view.mz === null && (
                <p className="banner">Pick a metabolite or enter an m/z to load blocks</p>
              )}
              {mainTrace?.status === "failed" && (
                <p className="banner banner-error">
                  Could not build the chromatogram: {mainTrace.message}
                </p>
              )}
              {mainTrace?.status === "loading" && (
                <p className="banner">Building the chromatogram…</p>
              )}
              {traces.length > 1 && <TraceLegend traces={traces} />}
              {view.mainReady && (
                <EicPlot
                  traces={traces}
                  peaks={
                    mainPeak && mainPeak.intensity > 0 ? [mainPeak] : []
                  }
                  baseline={baseline}
                  annotateRt={annotateRt}
                />
              )}
            </section>
          )}

          {samplePeaks.some((group) => group.ready) && (
            <PeakTable rows={samplePeaks} />
          )}
        </div>

      </main>

      {state.metabolitesOpen && (
        <ResizeHandle
          onResize={(cursorX) =>
            dispatch({ type: "setMetabolitesWidth", value: window.innerWidth - cursorX })
          }
        />
      )}

      <aside
        className={state.metabolitesOpen ? "sidebar right" : "sidebar right closed"}
        style={
          state.wideScreen && state.metabolitesOpen
            ? { width: state.metabolitesWidth }
            : undefined
        }
      >
        <div className="sidebar-head">
          <button
            type="button"
            className="sidebar-toggle"
            title={state.metabolitesOpen ? "Hide metabolites" : "Show metabolites"}
            onClick={() => dispatch({ type: "toggleMetabolites" })}
          >
            {state.metabolitesOpen ? "›" : "‹"}
          </button>
          {state.metabolitesOpen && (
            <span className="sidebar-label" title={metabolites.label}>
              Metabolites
            </span>
          )}
          {state.metabolitesOpen && (
            <span className="sidebar-count">{metabolites.list.length}</span>
          )}
        </div>
        {state.metabolitesOpen && (
          <div className="sidebar-body">
            <ConfigPanel />
            {metabolites.failed && (
              <p className="banner banner-error">
                Could not load the metabolite list: {metabolites.message}
              </p>
            )}
            {metabolites.loading && <p className="banner">Loading metabolites…</p>}
            <CompoundList
              compounds={metabolites.list}
              selectedLabel={state.pickedLabel}
            />
          </div>
        )}
      </aside>

      <button
        type="button"
        className={state.inspectOpen ? "inspect-fab active" : "inspect-fab"}
        title="Show downloaded bytes"
        onClick={() => dispatch({ type: "toggleInspect" })}
      >
        Inspect
      </button>
      {state.inspectOpen && <InspectPanel />}
    </div>
  );
}

export default App;
