import { memo, useMemo } from "react";
import {
  Annotation,
  Annotations,
  Axis,
  BarSeries,
  Plot,
  PlotController,
  useAxisWheelZoom,
  useAxisZoom,
  usePlotEvents,
} from "react-plot";
import type { SpectrumLine, SpectrumPanel } from "../context/useSpectra";
import { HeightHandle } from "./HeightHandle";
import { usePlotSize } from "../utilities/plotSize";

const barWidth = 1.5;
const markStroke = "#2563eb";
const shareOfHeight = 0.7;

interface ChartProps {
  lines: SpectrumLine[];
  xMin?: number;
  xMax?: number;
  markMz: number | null;
  width: number;
  height: number;
  onPickMz?: (mz: number) => void;
}

function Chart({ lines, xMin, xMax, markMz, width, height, onPickMz }: ChartProps) {
  useAxisWheelZoom();
  const zoom = useAxisZoom();
  usePlotEvents({
    onClick(result) {
      if (!onPickMz || !result.event.shiftKey) return;
      const mz = result.clampedCoordinates.x ?? result.coordinates.x;
      if (mz === undefined || Number.isNaN(mz)) return;
      onPickMz(mz);
    },
  });
  const hasBelowZero = useMemo(() => lines.some((line) => line.points.some((point) => point.y < 0)), [lines]);
  const barStyles = useMemo(() => {
    const styles: Record<string, { stroke: string; strokeWidth: number }> = {};
    for (const line of lines) styles[line.id] = { stroke: line.color, strokeWidth: barWidth };
    return styles;
  }, [lines]);

  return (
    <Plot width={width} height={height}>
      {lines.map((line) => (
        <BarSeries
          key={line.id}
          id={line.id}
          data={line.points}
          xAxis="x"
          yAxis="y"
          lineStyle={barStyles[line.id]}
        />
      ))}
      <Axis
        id="x"
        position="bottom"
        label="m/z"
        min={xMin}
        max={xMax}
        displayPrimaryGridLines={false}
      />
      <Axis id="y" position="left" label="Intensity" min={hasBelowZero ? undefined : 0} displayPrimaryGridLines />
      <Annotations>
        {markMz !== null && (
          <Annotation.Line
            x1={markMz}
            x2={markMz}
            y1={0}
            y2="0%"
            color={markStroke}
            strokeDasharray="5 4"
          />
        )}
        {zoom.annotations}
      </Annotations>
    </Plot>
  );
}

interface PrecursorBadgeProps {
  precursorMz: number;
  targetMz: number | null;
}

function readDeltaClass(delta: number): string {
  if (delta < 0.01) return "spectrum-badge good";
  if (delta < 0.1) return "spectrum-badge warn";
  return "spectrum-badge bad";
}

function PrecursorBadge({ precursorMz, targetMz }: PrecursorBadgeProps) {
  const delta = targetMz === null ? null : Math.abs(precursorMz - targetMz);
  return (
    <span className="spectrum-badges">
      <span className="spectrum-badge">
        <span className="spectrum-badge-key">precursor m/z</span>
        <strong>{precursorMz.toFixed(5)}</strong>
      </span>
      {delta !== null && (
        <span className={readDeltaClass(delta)}>
          <span className="spectrum-badge-key">Δ m/z</span>
          <strong>{delta.toFixed(4)}</strong>
        </span>
      )}
    </span>
  );
}

interface SpectrumPlotProps {
  name: string;
  panel: SpectrumPanel;
  targetMz: number | null;
  emptyHint: string;
  pickHint?: string;
  onPickMz?: (mz: number) => void;
  chosenHeight?: number | null;
  onResize?: (height: number | null) => void;
}

function readBody(panel: SpectrumPanel, emptyHint: string): string | null {
  if (panel.status === "idle") return emptyHint;
  if (panel.status === "loading") return "Loading scans…";
  if (panel.status === "failed") return `Could not read the scans: ${panel.message}`;
  if (panel.lines.length === 0) return panel.message ?? "No scans";
  return null;
}

export const SpectrumPlot = memo(function SpectrumPlot({
  name,
  panel,
  targetMz,
  emptyHint,
  pickHint,
  onPickMz,
  chosenHeight = null,
  onResize,
}: SpectrumPlotProps) {
  const { wrap, width, height } = usePlotSize(shareOfHeight, chosenHeight);
  const body = readBody(panel, emptyHint);
  const canPick = body === null && onPickMz !== undefined;

  return (
    <div className="spectrum-panel">
      <div className="spectrum-head">
        <span className="spectrum-label">
          {panel.label || name}
          {canPick && pickHint && <span className="spectrum-hint"> · {pickHint}</span>}
        </span>
        {panel.precursorMz !== null && (
          <PrecursorBadge precursorMz={panel.precursorMz} targetMz={targetMz} />
        )}
      </div>
      <div ref={wrap} className="plot-wrap">
        {body === null ? (
          <PlotController>
            <Chart
              lines={panel.lines}
              xMin={panel.xMin}
              xMax={panel.xMax}
              markMz={panel.markMz}
              width={width}
              height={height}
              onPickMz={canPick ? onPickMz : undefined}
            />
          </PlotController>
        ) : (
          <div
            className={panel.status === "failed" ? "plot-empty failed" : "plot-empty"}
            style={{ height }}
          >
            {body}
          </div>
        )}
      </div>
      {onResize && <HeightHandle height={height} onResize={onResize} onReset={() => onResize(null)} />}
    </div>
  );
});
