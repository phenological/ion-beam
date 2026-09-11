import type { Entry } from "./listSamples";

const uploadPrefix = "upload:";

export interface UploadedFile {
  path: string;
  bytes: Uint8Array;
}

interface Upload {
  folder: string;
  files: Map<string, Uint8Array>;
}

const uploads = new Map<string, Upload>();

export function isUploadFolder(path: string): boolean {
  return path.startsWith(uploadPrefix);
}

export function toUploadPath(zipName: string): string {
  return uploadPrefix + zipName;
}

export function isSampleFile(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith(".ion") || lower.endsWith(".mzml");
}

function toFullView(bytes: Uint8Array): Uint8Array {
  if (bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength) {
    return bytes;
  }
  return bytes.slice();
}

export function readBasename(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

export function storeUpload(zipName: string, files: UploadedFile[]): string {
  if (files.length === 0) throw new Error("no .ion or .mzML files in the zip");

  const folder = toUploadPath(zipName);
  const stored = new Map<string, Uint8Array>();
  for (const file of files) {
    stored.set(`${folder}/${file.path}`, toFullView(file.bytes));
  }
  uploads.set(folder, { folder, files: stored });
  return folder;
}

export function listUpload(path: string): Entry[] {
  const upload = uploads.get(path);
  if (!upload) return [];
  const entries: Entry[] = [];
  for (const url of upload.files.keys()) {
    entries.push({ name: readBasename(url), url, kind: "sample" });
  }
  return entries.sort((left, right) => left.name.localeCompare(right.name));
}

export function getUploadBytes(url: string): ArrayBuffer | null {
  for (const upload of uploads.values()) {
    const bytes = upload.files.get(url);
    if (bytes) return bytes.buffer as ArrayBuffer;
  }
  return null;
}
