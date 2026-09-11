import { memo, useEffect, useMemo, useState } from "react";
import type { Compound } from "../data/compounds";
import { useAppDispatch } from "../context/context";
import { CompoundForm } from "./CompoundForm";
import { CompoundMenu } from "./CompoundMenu";

type SortKey = "id" | "mz" | "rt";
type SortDir = "asc" | "desc";
type FormState = { mode: "add" } | { mode: "edit"; compound: Compound } | null;

interface CompoundListProps {
  compounds: Compound[];
  selectedLabel: string | null;
}

function sortCompounds(compounds: Compound[], key: SortKey, dir: SortDir): Compound[] {
  const factor = dir === "asc" ? 1 : -1;
  return [...compounds].sort((a, b) => {
    if (key === "id") return a.label.localeCompare(b.label) * factor;
    return (a[key] - b[key]) * factor;
  });
}

function nextSortState(
  column: SortKey,
  key: SortKey | null,
  dir: SortDir,
): { key: SortKey | null; dir: SortDir } {
  if (key !== column) return { key: column, dir: "asc" };
  if (dir === "asc") return { key: column, dir: "desc" };
  return { key: null, dir: "asc" };
}

function sortArrow(column: SortKey, key: SortKey | null, dir: SortDir): string {
  if (column !== key) return "";
  return dir === "asc" ? " ↑" : " ↓";
}

function findNextCompound(
  list: Compound[],
  selectedLabel: string | null,
  step: 1 | -1,
): Compound | null {
  if (list.length === 0) return null;
  const at = selectedLabel === null ? -1 : list.findIndex((compound) => compound.label === selectedLabel);
  if (at === -1) return step === 1 ? list[0] : list[list.length - 1];
  const nextIndex = at + step;
  if (nextIndex < 0 || nextIndex >= list.length) return list[at];
  return list[nextIndex];
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

export const CompoundList = memo(function CompoundList({
  compounds,
  selectedLabel,
}: CompoundListProps) {
  const dispatch = useAppDispatch();
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [armedLabel, setArmedLabel] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(null);
  const [tsvError, setTsvError] = useState<string | null>(null);

  const sorted = useMemo(
    () => (sortKey === null ? compounds : sortCompounds(compounds, sortKey, sortDir)),
    [compounds, sortKey, sortDir],
  );

  useEffect(() => {
    if (armedLabel === null) return undefined;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setArmedLabel(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [armedLabel]);

  useEffect(() => {
    if (sorted.length === 0 || form !== null) return undefined;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      const next = findNextCompound(sorted, selectedLabel, step);
      if (next === null) return;
      dispatch({ type: "pickCompound", compound: next });
      const row = document.querySelector<HTMLElement>(
        `[data-label="${CSS.escape(next.label)}"]`,
      );
      row?.scrollIntoView({ block: "nearest" });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sorted, selectedLabel, form, dispatch]);

  function sortBy(column: SortKey) {
    const next = nextSortState(column, sortKey, sortDir);
    setSortKey(next.key);
    setSortDir(next.dir);
  }

  const editingLabel = form?.mode === "edit" ? form.compound.label : null;
  const takenLabels = compounds
    .filter((compound) => compound.label !== editingLabel)
    .map((compound) => compound.label);

  return (
    <div className="compound-table">
      {tsvError && <p className="banner banner-error">{tsvError}</p>}

      {form && (
        <CompoundForm
          start={form.mode === "edit" ? form.compound : null}
          takenLabels={takenLabels}
          onCancel={() => setForm(null)}
          onSave={(compound) => {
            if (form.mode === "add") {
              dispatch({ type: "addCompound", compound });
            } else {
              dispatch({ type: "updateCompound", original: form.compound.label, compound });
            }
            setForm(null);
          }}
          onDelete={
            form.mode === "edit"
              ? () => {
                  dispatch({ type: "removeCompound", label: form.compound.label });
                  setForm(null);
                }
              : undefined
          }
        />
      )}

      <div className="compound-head">
        <button type="button" className="compound-col id" onClick={() => sortBy("id")}>
          ID{sortArrow("id", sortKey, sortDir)}
        </button>
        <button type="button" className="compound-col mz" onClick={() => sortBy("mz")}>
          m/z{sortArrow("mz", sortKey, sortDir)}
        </button>
        <button type="button" className="compound-col rt" onClick={() => sortBy("rt")}>
          rt{sortArrow("rt", sortKey, sortDir)}
        </button>
      </div>
      <ul className="compound-list">
        {sorted.map((compound) => {
          const isActive = compound.label === selectedLabel;
          const isArmed = compound.label === armedLabel;
          return (
            <li key={compound.label} className="compound-row">
              <button
                type="button"
                className={isActive ? "compound-item active" : "compound-item"}
                title={compound.label}
                data-label={compound.label}
                onClick={() => dispatch({ type: "pickCompound", compound })}
                onDoubleClick={() => setArmedLabel(compound.label)}
              >
                <span className="compound-id">{compound.label}</span>
                <span className="compound-mz">{compound.mz}</span>
                <span className="compound-rt">{compound.rt}</span>
              </button>
              {isArmed && (
                <button
                  type="button"
                  className="compound-edit"
                  title={`Edit ${compound.label}`}
                  onClick={() => {
                    setArmedLabel(null);
                    setTsvError(null);
                    setForm({ mode: "edit", compound });
                  }}
                >
                  Edit
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <CompoundMenu
        onAddByHand={() => {
          setArmedLabel(null);
          setTsvError(null);
          setForm({ mode: "add" });
        }}
        onLoaded={() => setArmedLabel(null)}
        onError={setTsvError}
      />
    </div>
  );
});
