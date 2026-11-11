import ConvertWorker from "./convertWorker?worker";
import type { ConvertSays } from "./convertWorker";

export interface ConvertFormat {
  toIon: boolean;
  from: string;
  to: string;
  megabytes: number;
}

export const ionFormat: ConvertFormat = { toIon: false, from: ".ion", to: ".mzML", megabytes: 500 };
export const mzmlFormat: ConvertFormat = { toIon: true, from: ".mzML", to: ".ion", megabytes: 1500 };

export function readFormat(name: string): ConvertFormat | null {
  const extension = name.toLowerCase().split(".").pop();
  if (extension === "ion") return ionFormat;
  if (extension === "mzml") return mzmlFormat;
  return null;
}

export function isTooBig(file: File, format: ConvertFormat): boolean {
  return file.size > format.megabytes * 1000 * 1000;
}

export function convertedName(name: string, format: ConvertFormat): string {
  return `${name.replace(/\.[^.]+$/, "")}${format.to}`;
}

export function convertFile(file: File, format: ConvertFormat, mzWindow: number, blockSize: number): Promise<Blob> {
  const worker = new ConvertWorker();
  return new Promise<Blob>((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<ConvertSays>) => {
      const says = event.data;
      if (says.type === "done") resolve(new Blob([says.bytes as BlobPart], { type: format.toIon ? "application/octet-stream" : "application/xml" }));
      else reject(new Error(says.message));
    };
    worker.onerror = (event) => reject(new Error(event.message || "the conversion stopped, the file may be too large"));
    worker.postMessage({ file, toIon: format.toIon, mzWindow, blockSize });
  }).finally(() => worker.terminate());
}
