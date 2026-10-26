import type { UnderstandingState } from "./types";

/** Single source of truth for how each understanding state looks and reads.
 *  Shape and colour both carry meaning (see StateGlyph) so state never depends on colour alone. */
export const STATE_META: Record<
  UnderstandingState,
  { label: string; description: string; dot: string; chip: string; hex: string; soft: string }
> = {
  demonstrated: {
    label: "Demonstrated",
    description: "Understanding shown through assessment.",
    dot: "bg-ok",
    chip: "bg-ok-soft text-ok-ink border-ok-line",
    hex: "var(--ok)",
    soft: "var(--ok-soft)",
  },
  partial: {
    label: "Partial",
    description: "Some understanding shown. More practice needed.",
    dot: "bg-amber",
    chip: "bg-amber-soft text-amber-ink border-amber-line",
    hex: "var(--amber)",
    soft: "var(--amber-soft)",
  },
  "suspected-gap": {
    label: "Suspected gap",
    description: "Evidence suggests a gap. This is an inference, not a verdict.",
    dot: "bg-bad",
    chip: "bg-bad-soft text-bad-ink border-bad-line",
    hex: "var(--bad)",
    soft: "var(--bad-soft)",
  },
  "not-assessed": {
    label: "Not yet assessed",
    description: "No evidence yet. This is not a failure.",
    dot: "bg-idle",
    chip: "bg-idle-soft text-ink-2 border-idle-line",
    hex: "var(--idle)",
    soft: "var(--idle-soft)",
  },
};
