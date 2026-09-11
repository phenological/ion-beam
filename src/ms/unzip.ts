import { unzip, type Unzipped, type UnzipFileInfo } from "fflate";
import { isSampleFile, readBasename, type UploadedFile } from "./uploads";

function allowEntry(file: UnzipFileInfo): boolean {
  if (file.name.startsWith("__MACOSX/")) return false;
  const basename = readBasename(file.name);
  if (basename.startsWith(".")) return false;
  return isSampleFile(basename);
}

export function unzipSamples(zip: Uint8Array): Promise<UploadedFile[]> {
  return new Promise((resolve, reject) => {
    unzip(zip, { filter: allowEntry }, (error: Error | null, data: Unzipped) => {
      if (error) {
        reject(new Error("could not read the zip"));
        return;
      }
      const files = Object.entries(data).map(([path, bytes]) => ({ path, bytes }));
      resolve(files);
    });
  });
}
