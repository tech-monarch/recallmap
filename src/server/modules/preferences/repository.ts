import { eq, sql } from "drizzle-orm";
import type { Db } from "../../db/client";
import { appPreferences, learningPreferences } from "../../db/schema";
import type { UserContext } from "../../platform/request-context";
import type { AppPreferences, AppPreferencesPatch, LearningPreferences, LearningPreferencesPatch } from "../../../contracts/preferences";
import { requireUser } from "../shared";

export const DEFAULT_APP_PREFERENCES: AppPreferences = { theme: "system", mapLayout: "hierarchical", accessibility: {} };
export const DEFAULT_LEARNING_PREFERENCES: LearningPreferences = {
  goals: "",
  educationLevel: null,
  explanationStyle: [],
  explanationDepth: null,
  questionDifficulty: null,
  pace: null,
  revisionPreferences: {},
};

export class PreferencesRepository {
  constructor(private readonly db: Db) {}

  async getApp(ctx: UserContext): Promise<AppPreferences | null> {
    const userId = requireUser(ctx);
    const [r] = await this.db.select().from(appPreferences).where(eq(appPreferences.userId, userId)).limit(1);
    return r ? { theme: r.theme as AppPreferences["theme"], mapLayout: r.mapLayout as AppPreferences["mapLayout"], accessibility: r.accessibility } : null;
  }

  async upsertApp(ctx: UserContext, patch: AppPreferencesPatch): Promise<AppPreferences> {
    const userId = requireUser(ctx);
    const [r] = await this.db
      .insert(appPreferences)
      .values({ userId, ...patch })
      .onConflictDoUpdate({ target: appPreferences.userId, set: { ...patch, updatedAt: sql`now()` } })
      .returning();
    return { theme: r.theme as AppPreferences["theme"], mapLayout: r.mapLayout as AppPreferences["mapLayout"], accessibility: r.accessibility };
  }

  async getLearning(ctx: UserContext): Promise<LearningPreferences | null> {
    const userId = requireUser(ctx);
    const [r] = await this.db.select().from(learningPreferences).where(eq(learningPreferences.userId, userId)).limit(1);
    return r ? toLearning(r) : null;
  }

  async upsertLearning(ctx: UserContext, patch: LearningPreferencesPatch): Promise<LearningPreferences> {
    const userId = requireUser(ctx);
    const [r] = await this.db
      .insert(learningPreferences)
      .values({ userId, ...patch })
      .onConflictDoUpdate({ target: learningPreferences.userId, set: { ...patch, updatedAt: sql`now()` } })
      .returning();
    return toLearning(r);
  }
}

function toLearning(r: typeof learningPreferences.$inferSelect): LearningPreferences {
  return {
    goals: r.goals,
    educationLevel: r.educationLevel,
    explanationStyle: r.explanationStyle as LearningPreferences["explanationStyle"],
    explanationDepth: r.explanationDepth as LearningPreferences["explanationDepth"],
    questionDifficulty: r.questionDifficulty as LearningPreferences["questionDifficulty"],
    pace: r.pace as LearningPreferences["pace"],
    revisionPreferences: r.revisionPreferences,
  };
}
