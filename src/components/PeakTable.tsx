import { memo } from "react";
import type { SamplePeaks } from "../context/reducer";
import { TraceSwatch } from "./TraceSwatch";

interface PeakTableProps {
  rows: SamplePeaks[];
}

function formatAmount(value: number): string {
  return value === 0 ? "0" : value.toExponential(2);
}

function PeakRow({ row }: { row: SamplePeaks }) {
  return (
    <tr>
      <td className="peak-sample">
        <TraceSwatch color={row.color} />
        <span>{row.sample}</span>
        {row.main && <span className="peak-group-main">main</span>}
      </td>
      {!row.ready ? (
        <>
          <td>finding…</td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
        </>
      ) : (
        <>
          <td>{row.peak.rt.toFixed(3)}</td>
          <td>{formatAmount(row.peak.intensity)}</td>
          <td>{formatAmount(row.peak.integral)}</td>
          <td>{row.peak.from.toFixed(3)}</td>
          <td>{row.peak.to.toFixed(3)}</td>
          <td>{row.peak.nPoints}</td>
        </>
      )}
    </tr>
  );
}

export const PeakTable = memo(function PeakTable({ rows }: PeakTableProps) {
  const foundCount = rows.filter((row) => row.peak.intensity > 0).length;

  return (
    <div className="peak-table">
      <div className="peak-head">
        <span className="peak-label">Peaks</span>
        <span className="peak-count">{foundCount}</span>
      </div>
      <div className="peak-scroll">
        <table className="peaks">
          <thead>
            <tr>
              <th>Sample</th>
              <th>RT</th>
              <th>Intensity</th>
              <th>Integral</th>
              <th>From</th>
              <th>To</th>
              <th>NP</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <PeakRow key={row.sample} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});
