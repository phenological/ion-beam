import { useRef, type ChangeEvent } from "react";
import { useAppDispatch } from "../context/context";
import { readZip, type SkippedSample } from "../ms/zipClient";
import { storeUpload } from "../ms/uploads";
import { readError } from "../context/reducer";

function describeSkipped(skipped: SkippedSample[]): string {
  return skipped.map((sample) => `${sample.path}: ${sample.message}`).join("; ");
}

export function UploadButton() {
  const dispatch = useAppDispatch();
  const inputRef = useRef<HTMLInputElement>(null);

  async function onChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    dispatch({ type: "uploadStarted" });
    try {
      const result = await readZip(file, (progress) => {
        dispatch({ type: "uploadProgress", progress });
      });
      if (result.files.length === 0 && result.skipped.length > 0) {
        throw new Error(describeSkipped(result.skipped));
      }
      const path = storeUpload(file.name, result.files);
      dispatch({ type: "setPath", path });
      if (result.skipped.length > 0) {
        dispatch({ type: "uploadFailed", message: describeSkipped(result.skipped) });
      }
    } catch (error: unknown) {
      dispatch({ type: "uploadFailed", message: readError(error) });
    }
  }

  return (
    <>
      <button
        type="button"
        className="sidebar-upload"
        title="Upload a zip of .ion, .mzML or Bruker .d samples"
        onClick={() => inputRef.current?.click()}
      >
        Upload
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".zip"
        hidden
        onChange={(event) => void onChange(event)}
      />
    </>
  );
}
