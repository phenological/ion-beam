import { useCallback, useMemo, useRef, useState } from "react";
import { getTargetPeak } from "./ms/peaks";
import { getBaseline } from "./ms/baseline";
import { PathInput } from "./components/PathInput";
import { UploadButton } from "./components/UploadButton";
import { SampleList } from "./components/SampleList";
import { FolderList } from "./components/FolderList";
import { CompoundList } from "./components/CompoundList";
import { ConfigPanel } from "./components/ConfigPanel";
import { PlotPanels, type PickedValue } from "./components/PlotPanels";
import { PeakTable } from "./components/PeakTable";
import { ResizeHandle } from "./components/ResizeHandle";
import { InspectPanel } from "./components/InspectPanel";
import { ConvertModal } from "./components/ConvertModal";
import { TraceLegend } from "./components/TraceLegend";
import { AnnotationPanel } from "./components/AnnotationPanel";
import { HeightHandle } from "./components/HeightHandle";
import { automaticHeights, type PanelHeights, type PanelName } from "./utilities/savedPanels";
import { buildMirrorPanel, useAnnotation } from "./context/useAnnotation";
import { readSpectrumTarget } from "./context/useSpectra";
import { useStableByKey } from "./utilities/useStableByKey";
import { toLayoutPx } from "./utilities/uiZoom";
import { useAppDispatch, useAppState } from "./context/context";
import {
  activePath,
  peakOptions,
  selectCompounds,
  selectView,
  tracePeakKey,
  type Trace,
} from "./context/reducer";
import { useTracePeaks, useTraces } from "./context/useTraces";
import type { ZipProgress } from "./ms/zipClient";
import { readBasename } from "./ms/uploads";
import "./App.css";

function headline(
  mainSample: string | null,
  label: string | null,
  mz: number | null,
  traces: Trace[],
  showsCompounds: boolean,
): string {
  if (!mainSample) return "Pick a sample";
  if (showsCompounds) return `${mainSample} · ${traces.length} metabolites`;
  const target = label ?? (mz === null ? "no metabolite" : `m/z ${mz}`);
  if (traces.length < 2) return `${mainSample} · ${target}`;
  return `${traces.length} samples · ${target}`;
}

function describeUpload(progress: ZipProgress | null): string {
  if (!progress || progress.current === null) return "Reading the zip…";
  const step = Math.min(progress.done + 1, progress.total);
  return `Reading ${readBasename(progress.current)} (${step} of ${progress.total})…`;
}

const defaultAnnotationHeight = 300;

function App() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const view = selectView(state);
  const metabolites = selectCompounds(state);
  const traces = useTraces(state);
  const tracePeaks = useTracePeaks(state, traces);
  const showsCompounds = state.addedCompounds.length > 0;

  const sampleColors = useMemo(() => {
    const colors: Record<string, string> = {};
    for (const trace of traces) colors[trace.sample] ??= trace.color;
    return colors;
  }, [traces]);

  const compoundColors = useMemo(() => {
    const colors: Record<string, string> = {};
    if (!showsCompounds) return colors;
    for (const trace of traces) {
      const label = trace.compound?.label ?? (trace.main ? state.pickedLabel : null);
      if (label !== null) colors[label] = trace.color;
    }
    return colors;
  }, [traces, showsCompounds, state.pickedLabel]);

  const baseline = useMemo(
    () =>
      state.displayBaseline && view.mainReady ? getBaseline(view.mainPoints) : null,
    [state.displayBaseline, view.mainReady, view.mainPoints],
  );

  const annotateRt = state.annotate && state.targetRt !== null ? state.targetRt : null;
  const mainTrace = traces.find((trace) => trace.main) ?? null;
  const mainRow = tracePeaks.find((row) => row.main);
  const mainPeak = mainRow?.ready ? mainRow.peak : null;
  const peakPending = state.autoPeakPicking && mainRow !== undefined && !mainRow.ready;
  const mainPeaks = useMemo(
    () => (mainPeak && mainPeak.intensity > 0 ? [mainPeak] : []),
    [mainPeak],
  );
  const freshTarget = view.mainReady ? readSpectrumTarget(traces, mainPeak, peakPending) : null;
  const target = useStableByKey(freshTarget, freshTarget?.key ?? "");
  const [pickedRt, setPickedRt] = useState<PickedValue | null>(null);
  const [convertOpen, setConvertOpen] = useState(false);
  const [plotHeights, setPlotHeights] = useState<PanelHeights>(automaticHeights);
  const [annotationHeight, setAnnotationHeight] = useState(defaultAnnotationHeight);
  const [settingsHeight, setSettingsHeight] = useState<number | null>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const resizePlot = useCallback(
    (name: PanelName, height: number | null) => setPlotHeights((current) => ({ ...current, [name]: height })),
    [],
  );
  const targetKey = target?.key ?? "";
  const shownRt = pickedRt?.key === targetKey ? pickedRt.value : (target?.rt ?? null);
  const annotationTarget = useMemo(() => (target ? { ...target, rt: shownRt } : null), [target, shownRt]);
  const annotation = useAnnotation(state.annotate, annotationTarget);
  const [pickedMatch, setPickedMatch] = useState({ key: "", rank: 0 });
  const matchRank = pickedMatch.key === annotation.key ? pickedMatch.rank : 0;
  const selectedMatch = annotation.result?.matches[matchRank] ?? null;
  const mirror = useMemo(
    () => (selectedMatch ? buildMirrorPanel(annotation.result?.query ?? null, selectedMatch) : null),
    [selectedMatch, annotation.result],
  );

  function runPeakPicking() {
    const options = peakOptions(state);
    for (const trace of traces) {
      if (trace.status !== "ready") continue;
      const key = tracePeakKey(trace, state);
      if (key === null) continue;
      const peak = getTargetPeak(trace.points, trace.rt, trace.rtWindow, options);
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
              <p className="banner">{describeUpload(state.uploadStatus.progress)}</p>
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
            <p className="content-sub" title={traces.map((trace) => trace.name).join(", ")}>
              {headline(view.mainSample, state.pickedLabel, view.mz, traces, showsCompounds)}
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
          <button type="button" className="run-button ghost" title="Convert .ion to mzML, or mzML to .ion" onClick={() => setConvertOpen(true)}>
            ⇄ Convert
          </button>
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
                <PlotPanels
                  traces={traces}
                  peaks={mainPeaks}
                  baseline={baseline}
                  annotateRt={annotateRt}
                  annotate={state.annotate}
                  mirror={mirror}
                  match={selectedMatch}
                  annotationPending={annotation.status === "loading"}
                  pickedRt={pickedRt}
                  onPickRt={setPickedRt}
                  mainPeak={mainPeak}
                  peakPending={peakPending}
                  shown={state.shownPanels}
                  ppm={state.ppm}
                  mzTol={state.mzTol}
                  heights={plotHeights}
                  onResize={resizePlot}
                />
              )}
            </section>
          )}

          {tracePeaks.some((row) => row.ready) && (
            <PeakTable
              rows={tracePeaks}
              nameHeading={showsCompounds ? "Metabolite" : "Sample"}
            />
          )}
        </div>

      </main>

      {convertOpen && <ConvertModal onClose={() => setConvertOpen(false)} />}

      {state.metabolitesOpen && (
        <ResizeHandle
          onResize={(cursorX) =>
            dispatch({ type: "setMetabolitesWidth", value: toLayoutPx(window.innerWidth) - cursorX })
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
          <div className="sidebar-body sections">
            <div
              ref={settingsRef}
              className="sidebar-section"
              style={settingsHeight === null ? undefined : { height: settingsHeight }}
            >
              <ConfigPanel />
            </div>
            <HeightHandle
              height={settingsHeight ?? 0}
              measure={settingsRef}
              onResize={setSettingsHeight}
              onReset={() => setSettingsHeight(null)}
            />
            {state.annotate && (
              <>
                <AnnotationPanel
                  annotation={annotation}
                  height={annotationHeight}
                  selectedRank={matchRank}
                  onSelect={(rank) => setPickedMatch({ key: annotation.key, rank })}
                />
                <HeightHandle
                  height={annotationHeight}
                  onResize={setAnnotationHeight}
                  onReset={() => setAnnotationHeight(defaultAnnotationHeight)}
                />
              </>
            )}
            <div className="sidebar-section compounds">
              {metabolites.failed && (
                <p className="banner banner-error">
                  Could not load the metabolite list: {metabolites.message}
                </p>
              )}
              {metabolites.loading && <p className="banner">Loading metabolites…</p>}
              <CompoundList
                compounds={metabolites.list}
                selectedLabel={state.pickedLabel}
                compoundColors={compoundColors}
              />
            </div>
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
