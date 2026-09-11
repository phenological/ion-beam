import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useAppDispatch } from "../context/context";
import { readTruthSet } from "../data/truthSet";
import { readError } from "../context/reducer";

interface CompoundMenuProps {
  onAddByHand: () => void;
  onLoaded: () => void;
  onError: (message: string | null) => void;
}

export function CompoundMenu({ onAddByHand, onLoaded, onError }: CompoundMenuProps) {
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onPointerDown(event: PointerEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  function pickAddByHand() {
    setOpen(false);
    onAddByHand();
  }

  function pickTsv() {
    setOpen(false);
    onError(null);
    inputRef.current?.click();
  }

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    onError(null);
    try {
      const text = await file.text();
      const list = readTruthSet(text);
      if (list.length === 0) {
        onError("no rows with id, mz and rt found");
        return;
      }
      dispatch({ type: "replaceCompounds", list });
      onLoaded();
    } catch (error: unknown) {
      onError(readError(error) || "no rows with id, mz and rt found");
    }
  }

  return (
    <div className="compound-menu-wrap" ref={wrapRef}>
      {open && (
        <div className="compound-menu">
          <button type="button" className="compound-menu-item" onClick={pickAddByHand}>
            <span className="compound-menu-icon" aria-hidden="true">
              ✎
            </span>
            Add mannually
          </button>
          <button type="button" className="compound-menu-item" onClick={pickTsv}>
            <span className="compound-menu-icon" aria-hidden="true">
              <svg viewBox="0 0 16 16" width="14" height="14">
                <path
                  d="M3 2h6l4 4v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.3"
                />
                <path d="M9 2v4h4" fill="none" stroke="currentColor" strokeWidth="1.3" />
              </svg>
            </span>
            Load a TSV
          </button>
        </div>
      )}
      <button
        type="button"
        className={open ? "compound-menu-button open" : "compound-menu-button"}
        title="Add metabolites"
        onClick={() => setOpen((value) => !value)}
      >
        +
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".tsv,.txt,.csv"
        hidden
        onChange={(event) => void onFileChange(event)}
      />
    </div>
  );
}
