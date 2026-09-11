import { useRef, type ChangeEvent } from "react";
import { useAppDispatch } from "../context/context";
import { unzipSamples } from "../ms/unzip";
import { storeUpload } from "../ms/uploads";
import { readError } from "../context/reducer";

export function UploadButton() {
  const dispatch = useAppDispatch();
  const inputRef = useRef<HTMLInputElement>(null);

  async function onChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    dispatch({ type: "uploadStarted" });
    try {
      const buffer = await file.arrayBuffer();
      const files = await unzipSamples(new Uint8Array(buffer));
      const path = storeUpload(file.name, files);
      dispatch({ type: "setPath", path });
    } catch (error: unknown) {
      dispatch({ type: "uploadFailed", message: readError(error) });
    }
  }

  return (
    <>
      <button
        type="button"
        className="sidebar-upload"
        title="Upload a zip of samples"
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
