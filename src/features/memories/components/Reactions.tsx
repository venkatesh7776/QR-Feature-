import type { Reactions as ReactionCounts } from "../lib/types";

/** Reaction counts, most popular first. */
export function Reactions({ reactions, compact }: { reactions: ReactionCounts; compact?: boolean }) {
  const entries = Object.entries(reactions)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  if (!entries.length) return null;

  const shown = compact ? entries.slice(0, 3) : entries;
  return (
    <span className="flex shrink-0 items-center gap-2 tabular-nums">
      {shown.map(([emoji, n]) => (
        <span key={emoji} className="whitespace-nowrap">
          {emoji}
          {(n > 1 || !compact) && <span className="ml-0.5">{n}</span>}
        </span>
      ))}
    </span>
  );
}
