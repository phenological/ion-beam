const base = new URL(import.meta.env.BASE_URL, globalThis.location.origin).href;
const libraryFolder =
  import.meta.env.VITE_LIBRARY_FOLDER ?? "https://raw.githubusercontent.com/phenological/cipherlib/main/data/";
const rangesUrl = new URL("ranges.json", libraryFolder).href;
const searchDalton = 0.005;
const searchPpm = 20;

interface LibraryPiece {
  url: string;
  mz: { from: number; to: number };
}

let storedPieces: Promise<LibraryPiece[]> | null = null;

function readPiece(row: unknown): LibraryPiece {
  const piece = row as { name?: unknown; mz?: { from?: unknown; to?: unknown } };
  const { name, mz } = piece;
  if (typeof name !== "string" || typeof mz?.from !== "number" || typeof mz.to !== "number") {
    throw new Error(`${rangesUrl} has an entry without a name and an mz {from, to}`);
  }
  return { url: new URL(name, libraryFolder).href, mz: { from: mz.from, to: mz.to } };
}

async function fetchPieces(): Promise<LibraryPiece[]> {
  const response = await fetch(rangesUrl);
  if (!response.ok) throw new Error(`could not read the library list ${rangesUrl}: got ${response.status}`);
  const rows: unknown = await response.json();
  if (!Array.isArray(rows)) throw new Error(`${rangesUrl} is not a list`);
  return rows.map(readPiece);
}

function readPieces(): Promise<LibraryPiece[]> {
  storedPieces ??= fetchPieces().catch((error: unknown) => {
    storedPieces = null;
    throw error;
  });
  return storedPieces;
}

export const modelSource = new URL(import.meta.env.VITE_ANNOTATION_MODEL ?? "model.onnx", base).href;
export const matchCount = 10;

export async function findLibraries(mz: number): Promise<string[]> {
  const window = Math.max(searchDalton, mz * searchPpm * 1e-6);
  const pieces = await readPieces();
  return pieces
    .filter((piece) => mz + window >= piece.mz.from && mz - window <= piece.mz.to)
    .map((piece) => piece.url);
}
