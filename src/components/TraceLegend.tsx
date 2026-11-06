import { memo } from "react";
import { useAppDispatch } from "../context/context";
import type { Trace } from "../context/reducer";
import { TraceSwatch } from "./TraceSwatch";

interface TraceLegendProps {
  traces: Trace[];
}

function readState(trace: Trace): string {
  if (trace.status === "loading") return "loading";
  if (trace.status === "failed") return "failed";
  return "";
}

export const TraceLegend = memo(function TraceLegend({ traces }: TraceLegendProps) {
  const dispatch = useAppDispatch();

  function removeTrace(trace: Trace) {
    if (trace.compound) {
      dispatch({ type: "toggleCompound", compound: trace.compound });
      return;
    }
    dispatch({ type: "toggleSample", name: trace.sample });
  }

  return (
    <ul className="trace-legend">
      {traces.map((trace) => {
        const state = readState(trace);
        return (
          <li key={trace.id} className="trace-item">
            <TraceSwatch color={trace.color} />
            <span className="trace-name" title={trace.name}>
              {trace.name}
            </span>
            {state && (
              <span
                className={trace.status === "failed" ? "trace-state failed" : "trace-state"}
                title={trace.message ?? ""}
              >
                {state}
              </span>
            )}
            {!trace.main && (
              <button
                type="button"
                className="trace-remove"
                title={`Remove ${trace.name} from the chart`}
                onClick={() => removeTrace(trace)}
              >
                ×
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
});
