import { init, parseIon, parseMzml, type SampleFile } from "quantion";
import { toFetchable } from "./remote";

const cacheSize = 16 * 1024 * 1024;

export async function openIonFile(url: string): Promise<SampleFile> {
  await init();
  const target = new URL(toFetchable(url), globalThis.location.origin);
  return parseIon(target, { maxCacheSize: cacheSize });
}

export async function openSampleBytes(
  bytes: ArrayBuffer,
  name: string,
): Promise<SampleFile> {
  await init();
  if (name.toLowerCase().endsWith(".mzml")) return parseMzml(bytes);
  return parseIon(bytes, { maxCacheSize: cacheSize });
}
