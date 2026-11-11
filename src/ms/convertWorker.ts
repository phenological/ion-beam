import { init, parseIon, parseMzml, writeIon, writeMzml } from "quantion";

export interface ConvertAsk {
  file: File;
  toIon: boolean;
  mzWindow: number;
  blockSize: number;
}

export type ConvertSays = { type: "done"; bytes: Uint8Array } | { type: "failed"; message: string };

const worker = self as unknown as {
  postMessage(message: ConvertSays, transfer?: Transferable[]): void;
  onmessage: ((event: MessageEvent<ConvertAsk>) => void) | null;
};

worker.onmessage = async (event) => {
  const { file, toIon, mzWindow, blockSize } = event.data;
  try {
    await init();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const sample = toIon ? await parseMzml(bytes) : await parseIon(bytes);
    const written = toIon ? await writeIon(sample, { mzWindow, blockSize }) : await writeMzml(sample);
    sample.dispose();
    if (!written) throw new Error("nothing was written");
    worker.postMessage({ type: "done", bytes: written }, [written.buffer]);
  } catch (error: unknown) {
    worker.postMessage({ type: "failed", message: error instanceof Error ? error.message : String(error) });
  }
};
