import { sql } from "drizzle-orm";
import { boolean, check, index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    name: text("name"),
    avatarUrl: text("avatar_url"),
    status: text("status").notNull().default("active"),
    onboardedAt: ts("onboarded_at"),
    deletionRequestedAt: ts("deletion_requested_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("users_email_lower_uq").on(sql`lower(${t.email})`),
    check("users_status_chk", sql`${t.status} in ('active','suspended','deleting')`),
  ],
);

/** Separate from users so account linking is explicit and further providers need no users change. */
export const authIdentities = pgTable(
  "auth_identities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerSubject: text("provider_subject").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("auth_identities_provider_subject_uq").on(t.provider, t.providerSubject),
    index("auth_identities_user_idx").on(t.userId),
    check("auth_identities_provider_chk", sql`${t.provider} in ('google')`),
  ],
);

/** Opaque session tokens are never stored: only their SHA-256 hash is the primary key. */
export const sessions = pgTable(
  "sessions",
  {
    idHash: text("id_hash").primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: ts("created_at").notNull().defaultNow(),
    lastSeenAt: ts("last_seen_at").notNull().defaultNow(),
    expiresAt: ts("expires_at").notNull(),
    revokedAt: ts("revoked_at"),
    replacedByIdHash: text("replaced_by_id_hash"),
    userAgent: text("user_agent"),
    ipHash: text("ip_hash"),
  },
  (t) => [index("sessions_user_idx").on(t.userId), index("sessions_expires_idx").on(t.expiresAt)],
);

/** Short-lived OAuth state + PKCE verifier (verifier encrypted by the auth module in B2). */
export const oauthStates = pgTable(
  "oauth_states",
  {
    stateHash: text("state_hash").primaryKey(),
    codeVerifierEnc: text("code_verifier_enc").notNull(),
    redirectTo: text("redirect_to"),
    expiresAt: ts("expires_at").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("oauth_states_expires_idx").on(t.expiresAt)],
);

/** Application preferences (UI behaviour). */
export const appPreferences = pgTable(
  "app_preferences",
  {
    userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
    theme: text("theme").notNull().default("system"),
    mapLayout: text("map_layout").notNull().default("hierarchical"),
    accessibility: jsonb("accessibility").$type<Record<string, boolean | string | number>>().notNull().default({}),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    check("app_preferences_theme_chk", sql`${t.theme} in ('light','dark','system')`),
    check("app_preferences_layout_chk", sql`${t.mapLayout} in ('hierarchical','dynamic')`),
  ],
);

/** Learning preferences: controlled by the learner; AI may suggest changes but never writes here. */
export const learningPreferences = pgTable(
  "learning_preferences",
  {
    userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
    goals: text("goals").notNull().default(""),
    educationLevel: text("education_level"),
    explanationStyle: text("explanation_style").array().notNull().default(sql`'{}'::text[]`),
    explanationDepth: text("explanation_depth"),
    questionDifficulty: text("question_difficulty"),
    pace: text("pace"),
    revisionPreferences: jsonb("revision_preferences").$type<Record<string, boolean | string | number>>().notNull().default({}),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [check("learning_preferences_goals_chk", sql`char_length(${t.goals}) <= 300`)],
);

/** Operational: lets the app tell "worker is running" from "service is asleep". Contains no learner data. */
export const workerHeartbeats = pgTable("worker_heartbeats", {
  instanceId: text("instance_id").primaryKey(),
  mode: text("mode").notNull(),
  startedAt: ts("started_at").notNull().defaultNow(),
  lastSeenAt: ts("last_seen_at").notNull().defaultNow(),
});
