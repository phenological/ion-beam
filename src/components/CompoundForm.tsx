import { useState, type KeyboardEvent } from "react";
import type { Compound } from "../data/compounds";

interface CompoundFormProps {
  start: Compound | null;
  takenLabels: string[];
  onSave: (compound: Compound) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

interface Draft {
  label: string;
  mz: string;
  rt: string;
}

function toDraft(start: Compound | null): Draft {
  if (!start) return { label: "", mz: "", rt: "" };
  return { label: start.label, mz: String(start.mz), rt: String(start.rt) };
}

function findFormError(draft: Draft, takenLabels: string[]): string | null {
  const label = draft.label.trim();
  if (label.length === 0) return "enter an id";
  if (takenLabels.includes(label)) return "that id is already in the list";
  const mz = Number(draft.mz);
  if (!Number.isFinite(mz) || mz <= 0) return "m/z must be a number above 0";
  const rt = Number(draft.rt);
  if (!Number.isFinite(rt) || rt < 0) return "rt must be a number of 0 or more";
  return null;
}

export function CompoundForm({
  start,
  takenLabels,
  onSave,
  onDelete,
  onCancel,
}: CompoundFormProps) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(start));
  const error = findFormError(draft, takenLabels);

  function save() {
    if (error) return;
    onSave({ label: draft.label.trim(), mz: Number(draft.mz), rt: Number(draft.rt) });
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") onCancel();
  }

  return (
    <div className="compound-form" onKeyDown={onKeyDown}>
      <div className="compound-form-row">
        <input
          type="text"
          placeholder="id"
          spellCheck={false}
          value={draft.label}
          onChange={(event) => setDraft({ ...draft, label: event.target.value })}
        />
        <input
          type="number"
          step="0.0001"
          placeholder="m/z"
          value={draft.mz}
          onChange={(event) => setDraft({ ...draft, mz: event.target.value })}
        />
        <input
          type="number"
          step="0.0001"
          placeholder="rt"
          value={draft.rt}
          onChange={(event) => setDraft({ ...draft, rt: event.target.value })}
        />
      </div>
      {error && <p className="banner banner-error">{error}</p>}
      <div className="compound-form-actions">
        <button type="button" className="run-button" onClick={save} disabled={Boolean(error)}>
          Save
        </button>
        {onDelete && (
          <button type="button" className="run-button danger" title="Delete" onClick={onDelete}>
            Delete
          </button>
        )}
        <button type="button" className="run-button ghost" title="Cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
