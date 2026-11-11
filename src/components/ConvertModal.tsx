import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { convertedName, convertFile, ionFormat, isTooBig, mzmlFormat, readFormat } from "../ms/convert";
import { readError } from "../context/reducer";

interface ConvertModalProps {
  onClose: () => void;
}

type Status =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "done"; address: string; name: string; size: number }
  | { kind: "failed"; message: string };

function formatSize(bytes: number): string {
  if (bytes >= 1000 * 1000) return `${(bytes / 1000 / 1000).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1000))} kB`;
}

export function ConvertModal({ onClose }: ConvertModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isOver, setIsOver] = useState(false);
  const [mzWindow, setMzWindow] = useState(20);
  const [blockSize, setBlockSize] = useState(8);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const format = file ? readFormat(file.name) : null;
  const tooBig = file !== null && format !== null && isTooBig(file, format);
  const isBusy = status.kind === "busy";
  const usesOptions = format === null || format.toIon;
  const address = status.kind === "done" ? status.address : null;

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useEffect(() => () => {
    if (address) URL.revokeObjectURL(address);
  }, [address]);

  function choose(chosen: File | undefined) {
    if (!chosen || isBusy) return;
    setFile(chosen);
    setStatus({ kind: "idle" });
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsOver(false);
    choose(event.dataTransfer.files[0]);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file || !format || tooBig) return;
    if (format.toIon && (!Number.isInteger(mzWindow) || mzWindow < 0 || !Number.isInteger(blockSize) || blockSize < 1)) {
      setStatus({ kind: "failed", message: "The m/z window must be a whole number, 0 or more, and the block size a whole number, 1 or more." });
      return;
    }
    setStatus({ kind: "busy" });
    try {
      const blob = await convertFile(file, format, mzWindow, blockSize);
      const name = convertedName(file.name, format);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = name;
      link.click();
      setStatus({ kind: "done", address: link.href, name, size: blob.size });
    } catch (error: unknown) {
      setStatus({ kind: "failed", message: readError(error) });
    }
  }

  const problem =
    file && !format
      ? "Only .ion and .mzML files can be converted."
      : tooBig && format
        ? `${format.from} files over ${format.megabytes} MB cannot be converted here.`
        : null;

  return (
    <dialog
      ref={dialogRef}
      className="convert-modal"
      onClose={onClose}
      onCancel={(event) => {
        if (isBusy) event.preventDefault();
      }}
    >
      <form className="convert-body" onSubmit={(event) => void onSubmit(event)}>
        <header className="convert-head">
          <h2 className="convert-title">Convert a file</h2>
          <button type="button" className="inspect-close" title="Close" disabled={isBusy} onClick={() => dialogRef.current?.close()}>
            ×
          </button>
        </header>
        <p className="convert-sub">.ion to mzML, or mzML to .ion. The file stays on your computer.</p>

        <label
          className={`convert-drop${isOver ? " over" : ""}${isBusy ? " disabled" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            setIsOver(true);
          }}
          onDragLeave={() => setIsOver(false)}
          onDrop={onDrop}
        >
          <input
            type="file"
            className="convert-file"
            accept=".ion,.mzML,.mzml"
            disabled={isBusy}
            onChange={(event) => {
              choose(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <span className="convert-pick">{file ? "Choose another file" : "Choose a file"}</span>
          <span className="convert-name">
            {file
              ? `${file.name} · ${formatSize(file.size)}`
              : `or drop it here: .ion up to ${ionFormat.megabytes} MB, .mzML up to ${mzmlFormat.megabytes} MB`}
          </span>
        </label>

        <fieldset className="convert-options" disabled={isBusy || !usesOptions}>
          <legend className="config-label">{usesOptions ? "Options for mzML to .ion" : "No options for .ion to mzML"}</legend>
          <label className="config-field">
            <span className="config-label">m/z window (Da)</span>
            <input type="number" min={0} step={1} value={mzWindow} onChange={(event) => setMzWindow(Number(event.target.value))} />
          </label>
          <label className="config-field">
            <span className="config-label">Block size (MB)</span>
            <input type="number" min={1} step={1} value={blockSize} onChange={(event) => setBlockSize(Number(event.target.value))} />
          </label>
        </fieldset>

        <p className="convert-warning">
          For large files or demanding processing, use the{" "}
          <a href="https://github.com/phenological/quantion" target="_blank" rel="noreferrer">
            Quant·ion library
          </a>{" "}
          in your favorite language.
        </p>
        {problem && <p className="banner banner-error">{problem}</p>}
        {status.kind === "failed" && <p className="banner banner-error">Could not convert: {status.message}</p>}
        {status.kind === "done" && (
          <p className="banner">
            Done:{" "}
            <a href={status.address} download={status.name}>
              {status.name}
            </a>{" "}
            · {formatSize(status.size)}
          </p>
        )}

        <button type="submit" className="run-button" disabled={isBusy || !format || tooBig}>
          {isBusy ? "Converting…" : format ? `Convert to ${format.to}` : "Convert"}
        </button>
      </form>
    </dialog>
  );
}
