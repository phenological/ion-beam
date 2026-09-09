import type { Compound } from "./compounds";
import { toDatasetUrl, type Dataset } from "./datasets";

const idColumns = ["feature_id", "id", "label", "name"];
const mzColumns = ["mz", "m/z"];
const rtColumns = ["rt", "retention_time"];
const formulaColumns = ["formula", "mf"];

export async function getTruthSet(dataset: Dataset): Promise<Compound[]> {
  if (!dataset.file) return dataset.list ?? [];
  const response = await fetch(toDatasetUrl(dataset.file));
  if (!response.ok) {
    throw new Error(`server answered ${response.status}`);
  }
  return readTruthSet(await response.text());
}

export function readTruthSet(text: string): Compound[] {
  const rows = text.split(/\r?\n/).filter((row) => row.trim().length > 0);
  if (rows.length === 0) throw new Error("the list is empty");

  const header = rows[0].split("\t").map((cell) => cell.trim().toLowerCase());
  const idAt = findColumn(header, idColumns);
  const mzAt = findColumn(header, mzColumns);
  const rtAt = findColumn(header, rtColumns);
  const formulaAt = findColumn(header, formulaColumns);
  if (idAt === -1 || mzAt === -1 || rtAt === -1) {
    throw new Error("the list needs id, mz and rt columns");
  }

  const found: Compound[] = [];
  for (const row of rows.slice(1)) {
    const cells = row.split("\t");
    const label = (cells[idAt] ?? "").trim();
    const mz = Number(cells[mzAt]);
    const rt = Number(cells[rtAt]);
    if (label.length === 0) continue;
    if (!Number.isFinite(mz) || !Number.isFinite(rt)) continue;
    const formula = formulaAt === -1 ? "" : (cells[formulaAt] ?? "").trim();
    found.push(formula.length > 0 ? { label, mz, rt, MF: formula } : { label, mz, rt });
  }
  return found;
}

function findColumn(header: string[], names: string[]): number {
  for (const name of names) {
    const at = header.indexOf(name);
    if (at !== -1) return at;
  }
  return -1;
}
