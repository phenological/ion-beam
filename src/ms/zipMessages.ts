export interface AskZipWorker {
  zip: Blob;
}

export type ZipWorkerSays =
  | { type: "found"; total: number }
  | { type: "started"; path: string }
  | { type: "sample"; path: string; bytes: Uint8Array }
  | { type: "skipped"; path: string; message: string }
  | { type: "done" }
  | { type: "failed"; message: string };

export interface ZipWorkerScope {
  postMessage(message: ZipWorkerSays, transfer?: Transferable[]): void;
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<AskZipWorker>) => void,
  ): void;
}
