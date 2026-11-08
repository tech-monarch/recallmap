import { z } from "zod";

export const THEMES = ["light", "dark", "system"] as const;
export const MAP_LAYOUTS = ["hierarchical", "dynamic"] as const;

/** Application preferences (UI behaviour). Distinct from learning preferences. */
export const appPreferencesSchema = z.object({
  theme: z.enum(THEMES),
  mapLayout: z.enum(MAP_LAYOUTS),
  accessibility: z.record(z.string(), z.union([z.boolean(), z.string(), z.number()])),
});
export const appPreferencesPatchSchema = appPreferencesSchema.partial().strict();
export type AppPreferences = z.infer<typeof appPreferencesSchema>;
export type AppPreferencesPatch = z.infer<typeof appPreferencesPatchSchema>;

export const EXPLANATION_STYLES = ["examples", "step_by_step", "analogies", "concise", "visual"] as const;
export const LEVELS = ["simple", "standard", "advanced"] as const;

/** Learning preferences (controlled by the learner; AI may suggest, never write). */
export const learningPreferencesSchema = z.object({
  goals: z.string().max(300),
  educationLevel: z.string().max(80).nullable(),
  explanationStyle: z.array(z.enum(EXPLANATION_STYLES)).max(5),
  explanationDepth: z.enum(LEVELS).nullable(),
  questionDifficulty: z.enum(LEVELS).nullable(),
  pace: z.enum(["relaxed", "steady", "intensive"]).nullable(),
  revisionPreferences: z.record(z.string(), z.union([z.boolean(), z.string(), z.number()])),
});
export const learningPreferencesPatchSchema = learningPreferencesSchema.partial().strict();
export type LearningPreferences = z.infer<typeof learningPreferencesSchema>;
export type LearningPreferencesPatch = z.infer<typeof learningPreferencesPatchSchema>;
