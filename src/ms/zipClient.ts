import ZipWorker from "./zipWorker?worker";
import type { UploadedFile } from "./uploads";
import type { ZipWorkerSays } from "./zipMessages";

export interface ZipProgress {
  done: number;
  total: number;
  current: string | null;
}

export interface SkippedSample {
  path: string;
  message: string;
}

export interface ZipResult {
  files: UploadedFile[];
  skipped: SkippedSample[];
}

export function readZip(
  zip: Blob,
  onProgress: (progress: ZipProgress) => void,
): Promise<ZipResult> {
  const worker = new ZipWorker();
  const files: UploadedFile[] = [];
  const skipped: SkippedSample[] = [];
  const progress: ZipProgress = { done: 0, total: 0, current: null };

  return new Promise<ZipResult>((resolve, reject) => {
    worker.addEventListener("message", (event: MessageEvent<ZipWorkerSays>) => {
      const says = event.data;
      if (says.type === "found") {
        progress.total = says.total;
      } else if (says.type === "started") {
        progress.current = says.path;
      } else if (says.type === "sample") {
        files.push({ path: says.path, bytes: says.bytes });
        progress.done += 1;
      } else if (says.type === "skipped") {
        skipped.push({ path: says.path, message: says.message });
        progress.done += 1;
      } else if (says.type === "done") {
        resolve({ files, skipped });
        return;
      } else {
        reject(new Error(says.message));
        return;
      }
      onProgress({ ...progress });
    });
    worker.addEventListener("error", (event: ErrorEvent) => {
      reject(new Error(event.message || "the zip reader crashed"));
    });
    worker.addEventListener("messageerror", () => {
      reject(new Error("the zip reader sent an unreadable message"));
    });
    worker.postMessage({ zip });
  }).finally(() => {
    worker.terminate();
  });
}
