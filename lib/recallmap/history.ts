import type { ActivityStatus, ActivityType, AssessmentAttempt, LearnerData, LearningActivity } from "./types";
import { attemptsFor, recommendedActivities } from "./progress";

export const ACTIVITY_LABEL: Record<ActivityType, string> = {
  "study-session": "Study session",
  assessment: "Assessment",
  "follow-up-assessment": "Follow-up assessment",
  "retention-check": "Retention check",
  practice: "Practice",
};

export type HistoryFilters = { subjectId: string | "all"; type: ActivityType | "all"; status: ActivityStatus | "all" };
export const NO_FILTERS: HistoryFilters = { subjectId: "all", type: "all", status: "all" };

/** Completed activities newest first, then recommendations. Recommendations are derived, never stored as history. */
export function allActivities(d: LearnerData): LearningActivity[] {
  const completed = d.activities.filter((a) => a.status === "completed").sort((x, y) => (y.sequence ?? 0) - (x.sequence ?? 0));
  return [...completed, ...recommendedActivities(d)];
}

export const filterHistory = (items: LearningActivity[], f: HistoryFilters): LearningActivity[] =>
  items.filter((a) => (f.subjectId === "all" || a.subjectId === f.subjectId) && (f.type === "all" || a.type === f.type) && (f.status === "all" || a.status === f.status));

export const attemptsForActivity = (d: LearnerData, activityId: string): AssessmentAttempt[] => d.attempts.filter((a) => a.activityId === activityId);

/** The scored attempt on the same concept immediately before this one, if any. */
export function priorAttempt(d: LearnerData, attempt: AssessmentAttempt): AssessmentAttempt | null {
  const before = attemptsFor(d, attempt.conceptId).filter((a) => a.sequence < attempt.sequence);
  return before[before.length - 1] ?? null;
}
