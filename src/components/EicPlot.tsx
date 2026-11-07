import { memo, useMemo } from "react";
import {
  Annotation,
  Annotations,
  Axis,
  LineSeries,
  Plot,
  PlotController,
  useAxisWheelZoom,
  useAxisZoom,
  usePlotEvents,
} from "react-plot";
import type { Point } from "../ms/eic";
import type { Peak } from "../ms/peaks";
import type { Trace } from "../context/reducer";
import { HeightHandle } from "./HeightHandle";
import { usePlotSize } from "../utilities/plotSize";

const traceWidth = 1.5;
const baselineStyle = { stroke: "#ef4444", strokeWidth: 2, strokeDasharray: "6 4" };
const peakFill = "rgba(51, 65, 85, 0.16)";
const peakStroke = "#334155";
const annotateStroke = "#2563eb";
const markStroke = "#94a3b8";

interface LineStyle {
  stroke: string;
  strokeWidth: number;
}

function readLineStyles(traces: Trace[]): Record<string, LineStyle> {
  const styles: Record<string, LineStyle> = {};
  for (const trace of traces) {
    styles[trace.id] = { stroke: trace.color, strokeWidth: traceWidth };
  }
  return styles;
}

interface ChartProps {
  traces: Trace[];
  peaks: Peak[];
  baseline: Point[] | null;
  annotateRt: number | null;
  markRt: number | null;
  width: number;
  height: number;
  onPickRt?: (rt: number) => void;
}

function Chart({
  traces,
  peaks,
  baseline,
  annotateRt,
  markRt,
  width,
  height,
  onPickRt,
}: ChartProps) {
  useAxisWheelZoom();
  const zoom = useAxisZoom();
  usePlotEvents({
    onClick(result) {
      if (!onPickRt || !result.event.shiftKey) return;
      const rt = result.clampedCoordinates.x ?? result.coordinates.x;
      if (rt === undefined || Number.isNaN(rt)) return;
      onPickRt(rt);
    },
  });
  const lineStyles = useMemo(() => readLineStyles(traces), [traces]);

  return (
    <Plot width={width} height={height}>
      {traces.map((trace) => (
        <LineSeries
          key={trace.id}
          id={trace.id}
          label={trace.name}
          data={trace.points}
          xAxis="x"
          yAxis="y"
          lineStyle={lineStyles[trace.id]}
        />
      ))}
      {baseline && (
        <LineSeries
          id="baseline"
          data={baseline}
          xAxis="x"
          yAxis="y"
          lineStyle={baselineStyle}
        />
      )}
      <Axis id="x" position="bottom" label="Time (min)" displayPrimaryGridLines={false} />
      <Axis id="y" position="left" label="Intensity" displayPrimaryGridLines />
      <Annotations>
        {markRt !== null && (
          <Annotation.Line
            x1={markRt}
            x2={markRt}
            y1={0}
            y2="0%"
            color={markStroke}
            strokeDasharray="2 3"
          />
        )}
        {annotateRt !== null && (
          <Annotation.Line
            x1={annotateRt}
            x2={annotateRt}
            y1={0}
            y2="0%"
            color={annotateStroke}
            strokeDasharray="5 4"
          />
        )}
        {peaks.flatMap((peak, index) => [
          <Annotation.Rectangle
            key={`box-${index}`}
            x1={peak.from}
            x2={peak.to}
            y1={0}
            y2={peak.intensity}
            color={peakFill}
          />,
          <Annotation.Line
            key={`apex-${index}`}
            x1={peak.rt}
            x2={peak.rt}
            y1={0}
            y2={peak.intensity}
            color={peakStroke}
            strokeDasharray="3 3"
          />,
        ])}
        {zoom.annotations}
      </Annotations>
    </Plot>
  );
}

interface EicPlotProps {
  traces: Trace[];
  peaks: Peak[];
  baseline: Point[] | null;
  annotateRt: number | null;
  markRt?: number | null;
  onPickRt?: (rt: number) => void;
  chosenHeight?: number | null;
  onResize?: (height: number | null) => void;
}

export const EicPlot = memo(function EicPlot({
  traces,
  peaks,
  baseline,
  annotateRt,
  markRt = null,
  onPickRt,
  chosenHeight = null,
  onResize,
}: EicPlotProps) {
  const { wrap, width, height, plotHeight } = usePlotSize(1, chosenHeight);
  const hasPoints = traces.some((trace) => trace.points.length > 0);
  return (
    <div ref={wrap} className="plot-wrap">
      <PlotController>
        {hasPoints ? (
          <Chart
            traces={traces}
            peaks={peaks}
            baseline={baseline}
            annotateRt={annotateRt}
            markRt={markRt}
            width={width}
            height={plotHeight}
            onPickRt={onPickRt}
          />
        ) : (
          <div className="plot-empty" style={{ height: plotHeight }}>
            No signal in this range
          </div>
        )}
      </PlotController>
      {onResize && <HeightHandle height={height} onResize={onResize} onReset={() => onResize(null)} />}
    </div>
  );
});
