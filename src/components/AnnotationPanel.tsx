import { memo } from "react";
import { SmilesSvgRenderer } from "react-ocl";
import type { AnnotationState } from "../context/useAnnotation";
import type { LibraryMatch } from "../ms/workerMessages";

function readMessage(annotation: AnnotationState): string | null {
  if (annotation.status === "idle") return "Pick a metabolite with a retention time to annotate it";
  if (annotation.status === "loading") return "Searching the library…";
  if (annotation.status === "failed") return `Could not annotate: ${annotation.message}`;
  if (!annotation.result || annotation.result.matches.length === 0) return "No library match for this feature";
  return null;
}

interface MatchCardProps {
  match: LibraryMatch;
  rank: number;
  isSelected: boolean;
  onSelect: () => void;
}

function MatchCard({ match, rank, isSelected, onSelect }: MatchCardProps) {
  return (
    <button
      type="button"
      className={isSelected ? "match-card selected" : "match-card"}
      title={`${match.label} · ${match.database} ${match.id}`}
      onClick={onSelect}
    >
      <span className="match-rank">{rank}</span>
      <span className="match-molecule">
        {match.smiles ? <SmilesSvgRenderer smiles={match.smiles} width={88} height={62} /> : null}
      </span>
      <span className="match-text">
        <strong>{match.label}</strong>
        <span>{match.formula}</span>
        <span>
          {match.database} · {match.id}
        </span>
        <span>
          score {match.score.toFixed(3)} · cosine {match.cosine.toFixed(3)}
        </span>
      </span>
    </button>
  );
}

interface AnnotationPanelProps {
  annotation: AnnotationState;
  selectedRank: number;
  onSelect: (rank: number) => void;
}

export const AnnotationPanel = memo(function AnnotationPanel({ annotation, selectedRank, onSelect }: AnnotationPanelProps) {
  const message = readMessage(annotation);
  const matches = annotation.result?.matches ?? [];

  return (
    <div className="annotation-panel">
      <span className="sidebar-label">Annotation</span>
      {message !== null ? (
        <p className={annotation.status === "failed" ? "banner banner-error" : "banner"}>{message}</p>
      ) : (
        <div className="match-list">
          {matches.map((match, index) => (
            <MatchCard
              key={`${match.database}:${match.id}`}
              match={match}
              rank={index + 1}
              isSelected={index === selectedRank}
              onSelect={() => onSelect(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
});
