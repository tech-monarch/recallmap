import {
  appPreferencesPatchSchema,
  learningPreferencesPatchSchema,
  type AppPreferences,
  type LearningPreferences,
} from "../../../contracts/preferences";
import type { UserContext } from "../../platform/request-context";
import { DEFAULT_APP_PREFERENCES, DEFAULT_LEARNING_PREFERENCES, type PreferencesRepository } from "./repository";

/** Application service: validates untrusted input, applies defaults, never lets the AI write preferences. */
export class PreferencesService {
  constructor(private readonly repo: PreferencesRepository) {}

  async getApp(ctx: UserContext): Promise<AppPreferences> {
    return (await this.repo.getApp(ctx)) ?? DEFAULT_APP_PREFERENCES;
  }

  async updateApp(ctx: UserContext, input: unknown): Promise<AppPreferences> {
    const patch = appPreferencesPatchSchema.parse(input);
    return this.repo.upsertApp(ctx, patch);
  }

  async getLearning(ctx: UserContext): Promise<LearningPreferences> {
    return (await this.repo.getLearning(ctx)) ?? DEFAULT_LEARNING_PREFERENCES;
  }

  async updateLearning(ctx: UserContext, input: unknown): Promise<LearningPreferences> {
    const patch = learningPreferencesPatchSchema.parse(input);
    return this.repo.upsertLearning(ctx, patch);
  }
}
