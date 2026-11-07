import { memo, useState } from "react";
import { useAppDispatch } from "../context/context";
import type { Point } from "../ms/eic";
import type { Peak } from "../ms/peaks";
import type { Trace } from "../context/reducer";
import {
  readSpectrumTarget,
  useMs1Panel,
  useMs2Panel,
  type SpectrumPanel,
} from "../context/useSpectra";
import {
  panelNames,
  type PanelHeights,
  type PanelName,
  type ShownPanels,
} from "../utilities/savedPanels";
import { useStableByKey } from "../utilities/useStableByKey";
import { addLibraryMatch } from "../context/useAnnotation";
import type { LibraryMatch } from "../ms/workerMessages";
import { EicPlot } from "./EicPlot";
import { SpectrumPlot } from "./SpectrumPlot";

const panelTitles: Record<PanelName, string> = {
  chromatogram: "Chromatogram",
  ms1: "MS1",
  ms2: "MS2",
};

export interface PickedValue {
  key: string;
  value: number;
}

interface PlotPanelsProps {
  traces: Trace[];
  peaks: Peak[];
  baseline: Point[] | null;
  annotateRt: number | null;
  annotate: boolean;
  mirror: SpectrumPanel | null;
  match: LibraryMatch | null;
  annotationPending: boolean;
  pickedRt: PickedValue | null;
  onPickRt: (picked: PickedValue | null) => void;
  mainPeak: Peak | null;
  peakPending: boolean;
  shown: ShownPanels;
  ppm: number;
  mzTol: number;
  heights: PanelHeights;
  onResize: (name: PanelName, height: number | null) => void;
}

function pickMs2Panel(
  ms2: SpectrumPanel,
  mirror: SpectrumPanel | null,
  match: LibraryMatch | null,
  annotationPending: boolean,
  closestMz: number | null,
): SpectrumPanel {
  if (closestMz !== null) return match ? addLibraryMatch(ms2, match) : ms2;
  if (mirror) return mirror;
  if (annotationPending) {
    return { ...ms2, status: "loading", lines: [], message: "Searching the library for the MS2 match…" };
  }
  return ms2;
}

function getPickedValue(
  picked: PickedValue | null,
  key: string,
): number | null {
  return picked?.key === key ? picked.value : null;
}

export const PlotPanels = memo(function PlotPanels({
  traces,
  peaks,
  baseline,
  annotateRt,
  annotate,
  mirror,
  match,
  annotationPending,
  pickedRt,
  onPickRt,
  mainPeak,
  peakPending,
  shown,
  ppm,
  mzTol,
  heights,
  onResize,
}: PlotPanelsProps) {
  const dispatch = useAppDispatch();
  const visible: ShownPanels = annotate
    ? shown
    : { chromatogram: true, ms1: false, ms2: false };
  const [pickedMz, setPickedMz] = useState<PickedValue | null>(null);

  function resizer(name: PanelName) {
    return (height: number | null) => onResize(name, height);
  }

  const freshTarget = readSpectrumTarget(traces, mainPeak, peakPending);
  const target = useStableByKey(freshTarget, freshTarget?.key ?? "");
  const targetKey = target?.key ?? "";
  const ms1Rt = getPickedValue(pickedRt, targetKey) ?? target?.rt ?? null;
  const closestMz = getPickedValue(pickedMz, targetKey);

  const ms1 = useMs1Panel(visible.ms1, target, ms1Rt, ppm, mzTol);
  const ms2 = useMs2Panel(visible.ms2, target, ms1Rt, closestMz);

  function togglePanel(name: PanelName) {
    dispatch({ type: "togglePanel", name });
  }

  function pickRt(rt: number) {
    onPickRt({ key: targetKey, value: rt });
  }

  function pickMz(mz: number) {
    setPickedMz({ key: targetKey, value: mz });
  }

  return (
    <div className="plot-panels">
      <div className="panel-toolbar">
        {annotate && (
          <div className="panel-toggles">
            {panelNames.map((name) => (
              <button
                key={name}
                type="button"
                className={
                  visible[name] ? "panel-toggle active" : "panel-toggle"
                }
                aria-pressed={visible[name]}
                onClick={() => togglePanel(name)}
              >
                {panelTitles[name]}
              </button>
            ))}
          </div>
        )}
        {visible.ms2 && closestMz !== null && (
          <button
            type="button"
            className="panel-reset"
            onClick={() => setPickedMz(null)}
          >
            Back to MS2 at target
          </button>
        )}
        {visible.ms1 && (
          <span className="panel-hint">
            ⇧ + click: chromatogram → MS1 → MS2
          </span>
        )}
      </div>

      {visible.chromatogram && (
        <EicPlot
          traces={traces}
          peaks={peaks}
          baseline={baseline}
          annotateRt={annotateRt}
          markRt={visible.ms1 ? ms1Rt : null}
          onPickRt={visible.ms1 ? pickRt : undefined}
          chosenHeight={heights.chromatogram}
          onResize={resizer("chromatogram")}
        />
      )}
      {visible.ms1 && (
        <SpectrumPlot
          name="MS1"
          panel={ms1}
          targetMz={target?.mz ?? null}
          emptyHint="Pick a metabolite with a retention time, or ⇧ + click the chromatogram"
          pickHint={
            visible.ms2 ? "⇧ + click a peak for the closest MS2" : undefined
          }
          onPickMz={visible.ms2 ? pickMz : undefined}
          chosenHeight={heights.ms1}
          onResize={resizer("ms1")}
        />
      )}
      {visible.ms2 && (
        <SpectrumPlot
          name="MS2"
          panel={pickMs2Panel(ms2, mirror, match, annotationPending, closestMz)}
          targetMz={closestMz ?? target?.mz ?? null}
          emptyHint="Pick a metabolite with a retention time, or ⇧ + click the chromatogram"
          chosenHeight={heights.ms2}
          onResize={resizer("ms2")}
        />
      )}
    </div>
  );
});
