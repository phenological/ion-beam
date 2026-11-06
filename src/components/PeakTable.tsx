import { memo } from "react";
import type { TracePeak } from "../context/reducer";
import { TraceSwatch } from "./TraceSwatch";

interface PeakTableProps {
  rows: TracePeak[];
  nameHeading: string;
}

function formatAmount(value: number): string {
  return value === 0 ? "0" : value.toExponential(2);
}

function PeakRow({ row }: { row: TracePeak }) {
  return (
    <tr>
      <td className="peak-sample">
        <TraceSwatch color={row.color} />
        <span>{row.name}</span>
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

export const PeakTable = memo(function PeakTable({ rows, nameHeading }: PeakTableProps) {
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
              <th>{nameHeading}</th>
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
              <PeakRow key={row.id} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});
