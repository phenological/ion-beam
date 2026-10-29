import init, { convert_to_ion } from "ms-raw";
import { findContents, toIonPath, type RawFolder } from "./zipContents";
import type { ZipWorkerScope } from "./zipMessages";
import { listEntries, readEntry } from "./zipReader";
import { readBasename } from "./uploads";

const worker = self as unknown as ZipWorkerScope;

function readError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function sendSample(path: string, bytes: Uint8Array): void {
  worker.postMessage({ type: "sample", path, bytes }, [bytes.buffer]);
}

async function convertRawFolder(zip: Blob, folder: RawFolder): Promise<Uint8Array> {
  const paths: string[] = [];
  const files: Uint8Array[] = [];
  const innerStart = folder.path.length + 1;
  for (const entry of folder.entries) {
    paths.push(entry.name.slice(innerStart));
    files.push(await readEntry(zip, entry));
  }
  await init();
  return convert_to_ion(readBasename(folder.path), paths, files);
}

async function readZip(zip: Blob): Promise<void> {
  const contents = findContents(await listEntries(zip));
  worker.postMessage({
    type: "found",
    total: contents.samples.length + contents.rawFolders.length,
  });

  for (const entry of contents.samples) {
    worker.postMessage({ type: "started", path: entry.name });
    try {
      sendSample(entry.name, await readEntry(zip, entry));
    } catch (error: unknown) {
      worker.postMessage({ type: "skipped", path: entry.name, message: readError(error) });
    }
  }

  for (const folder of contents.rawFolders) {
    worker.postMessage({ type: "started", path: folder.path });
    try {
      sendSample(toIonPath(folder.path), await convertRawFolder(zip, folder));
    } catch (error: unknown) {
      worker.postMessage({ type: "skipped", path: folder.path, message: readError(error) });
    }
  }

  worker.postMessage({ type: "done" });
}

worker.addEventListener("message", (event) => {
  readZip(event.data.zip).catch((error: unknown) => {
    worker.postMessage({ type: "failed", message: readError(error) });
  });
});
