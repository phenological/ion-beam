import { isSampleFile, readBasename } from "./uploads";
import type { ZipEntry } from "./zipReader";

export interface RawFolder {
  path: string;
  entries: ZipEntry[];
}

export interface ZipContents {
  samples: ZipEntry[];
  rawFolders: RawFolder[];
}

const rawFolderEnding = ".d";

function allowEntry(entry: ZipEntry): boolean {
  if (entry.name.startsWith("__MACOSX/")) return false;
  if (entry.name.endsWith("/")) return false;
  return !readBasename(entry.name).startsWith(".");
}

function findRawFolder(name: string): string | null {
  const parts = name.split("/");
  for (let index = 0; index < parts.length - 1; index += 1) {
    if (parts[index].toLowerCase().endsWith(rawFolderEnding)) {
      return parts.slice(0, index + 1).join("/");
    }
  }
  return null;
}

export function toIonPath(rawFolderPath: string): string {
  return rawFolderPath.slice(0, -rawFolderEnding.length) + ".ion";
}

export function findContents(entries: ZipEntry[]): ZipContents {
  const samples: ZipEntry[] = [];
  const rawFolders = new Map<string, RawFolder>();
  for (const entry of entries) {
    if (!allowEntry(entry)) continue;
    const folderPath = findRawFolder(entry.name);
    if (folderPath !== null) {
      const folder = rawFolders.get(folderPath) ?? { path: folderPath, entries: [] };
      folder.entries.push(entry);
      rawFolders.set(folderPath, folder);
      continue;
    }
    if (isSampleFile(entry.name)) samples.push(entry);
  }
  const byPath = (left: { path: string }, right: { path: string }) =>
    left.path.localeCompare(right.path);
  return {
    samples: samples.sort((left, right) => left.name.localeCompare(right.name)),
    rawFolders: [...rawFolders.values()].sort(byPath),
  };
}
