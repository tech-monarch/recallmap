import type { ExplanationDepth, ExplanationStyle, LearnerPreferences, LearningPace, PreferredDifficulty } from "./types";
import type { TutorMode } from "./demo-tutor";

/** Defaults apply until the learner chooses otherwise. Every preference is optional. */
export const DEFAULT_PREFERENCES: LearnerPreferences = { goals: "", explanationStyle: [], explanationDepth: "standard", pace: "normal", difficulty: "standard" };

export const STYLE_OPTIONS: { id: ExplanationStyle; label: string; hint: string; supported: boolean }[] = [
  { id: "steps", label: "Step by step", hint: "Numbered stages, one idea at a time.", supported: true },
  { id: "examples", label: "Worked examples", hint: "A concrete case before the general rule.", supported: true },
  { id: "analogies", label: "Analogies", hint: "Compare it to something familiar.", supported: true },
  { id: "visual", label: "Visual explanations", hint: "Diagrams and pictures. The tutor cannot produce these yet; the choice is kept for when it can.", supported: false },
];
export const DEPTH_OPTIONS: { id: ExplanationDepth; label: string; hint: string }[] = [
  { id: "brief", label: "Brief", hint: "The core idea only." },
  { id: "standard", label: "Standard", hint: "The idea plus the reasoning." },
  { id: "detailed", label: "Detailed", hint: "Full reasoning, edge cases and connections." },
];
export const PACE_OPTIONS: { id: LearningPace; label: string; hint: string }[] = [
  { id: "slow", label: "Slow", hint: "Smaller steps, more checking in." },
  { id: "normal", label: "Normal", hint: "A balanced pace." },
  { id: "fast", label: "Fast", hint: "Bigger steps, fewer pauses." },
];
export const DIFFICULTY_OPTIONS: { id: PreferredDifficulty; label: string; hint: string }[] = [
  { id: "gentle", label: "Gentle", hint: "Start easier and build up." },
  { id: "standard", label: "Standard", hint: "Typical difficulty for the concept." },
  { id: "challenging", label: "Challenging", hint: "Harder questions sooner." },
];

export const toggleStyle = (current: ExplanationStyle[], id: ExplanationStyle): ExplanationStyle[] =>
  current.includes(id) ? current.filter((s) => s !== id) : [...current, id];

export const MAX_GOALS_LENGTH = 300;

/** Body for PUT /api/me/preferences (docs/API_CONTRACTS.md). Not sent anywhere yet. */
export function toApiPayload(p: LearnerPreferences) {
  return { goals: p.goals.trim().slice(0, MAX_GOALS_LENGTH), explanationStyle: p.explanationStyle, explanationDepth: p.explanationDepth, pace: p.pace, difficulty: p.difficulty };
}

export const samePreferences = (a: LearnerPreferences, b: LearnerPreferences) => JSON.stringify(toApiPayload(a)) === JSON.stringify(toApiPayload(b));

/** Validates untrusted stored JSON; anything malformed falls back to defaults field by field. */
export function parseStoredPreferences(raw: string | null): LearnerPreferences {
  if (!raw) return DEFAULT_PREFERENCES;
  try {
    const v = JSON.parse(raw) as Partial<LearnerPreferences> | null;
    if (!v || typeof v !== "object") return DEFAULT_PREFERENCES;
    const pick = <T extends string>(x: unknown, opts: { id: T }[], fb: T): T => (opts.some((o) => o.id === x) ? (x as T) : fb);
    const styles = Array.isArray(v.explanationStyle) ? v.explanationStyle.filter((s): s is ExplanationStyle => STYLE_OPTIONS.some((o) => o.id === s)) : [];
    return {
      goals: typeof v.goals === "string" ? v.goals.slice(0, MAX_GOALS_LENGTH) : "",
      explanationStyle: [...new Set(styles)],
      explanationDepth: pick(v.explanationDepth, DEPTH_OPTIONS, DEFAULT_PREFERENCES.explanationDepth),
      pace: pick(v.pace, PACE_OPTIONS, DEFAULT_PREFERENCES.pace),
      difficulty: pick(v.difficulty, DIFFICULTY_OPTIONS, DEFAULT_PREFERENCES.difficulty),
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

/** Tutor modes that exist today for each style. "visual" has no tutor mode yet. */
export const STYLE_TO_TUTOR_MODE: Partial<Record<ExplanationStyle, Exclude<TutorMode, "answer">>> = { steps: "steps", examples: "example", analogies: "analogy" };
export const preferredTutorModes = (p: LearnerPreferences) => p.explanationStyle.map((s) => STYLE_TO_TUTOR_MODE[s]).filter((m): m is Exclude<TutorMode, "answer"> => !!m);

/**
 * Illustrative sample of how choices change an explanation. Uses the canned demo text for one concept;
 * nothing here is produced by an AI. Depth: brief = overview only; standard = overview + first chosen
 * style; detailed = overview + every chosen style that the tutor supports today.
 */
export function previewParts(p: LearnerPreferences, text: { overview: string; steps: string; example: string; analogy: string }) {
  const body: Record<"steps" | "example" | "analogy", string> = { steps: text.steps, example: text.example, analogy: text.analogy };
  const label = { steps: "Step by step", example: "Worked example", analogy: "Analogy" } as const;
  const modes = preferredTutorModes(p).filter((m): m is "steps" | "example" | "analogy" => m in body);
  const used = p.explanationDepth === "brief" ? [] : p.explanationDepth === "standard" ? modes.slice(0, 1) : modes;
  return [{ label: "Overview", text: text.overview }, ...used.map((m) => ({ label: label[m], text: body[m] }))];
}
