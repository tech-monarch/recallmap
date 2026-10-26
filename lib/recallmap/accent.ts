/** Accent colors identify SUBJECTS only. Understanding states keep their own green/amber/red/grey (state.ts). */
export type Accent = { solid: string; soft: string; text: string };
export const SUBJECT_ACCENTS: Accent[] = [
  { solid: "var(--subj-1)", soft: "var(--subj-1-soft)", text: "var(--subj-1-text)" }, // brand blue
  { solid: "var(--subj-2)", soft: "var(--subj-2-soft)", text: "var(--subj-2-text)" }, // charcoal
  { solid: "var(--subj-3)", soft: "var(--subj-3-soft)", text: "var(--subj-3-text)" }, // deep blue
  { solid: "var(--subj-4)", soft: "var(--subj-4-soft)", text: "var(--subj-4-text)" }, // slate
];
export const accentFor = (subjectIds: string[], id: string): Accent => SUBJECT_ACCENTS[Math.max(0, subjectIds.indexOf(id)) % SUBJECT_ACCENTS.length];
