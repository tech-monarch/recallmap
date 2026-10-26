import type { Concept, LearnerPreferences } from "./types";
import { CONCEPT_TUTOR, PRACTICE, type PracticeQuestion, type TutorMode } from "./demo-tutor";

/**
 * Tutor client boundary.
 * Request/response shapes mirror the future endpoint POST /api/tutor (docs/API_CONTRACTS.md).
 * Today askTutor() returns CANNED DEMONSTRATION text and never calls any AI service.
 * To integrate Gemini later, replace the body of askTutor() with a fetch to the backend.
 */
export type TutorRequest = {
  subjectId: string;
  materialId: string;
  conceptId: string | null;
  mode: TutorMode;
  question?: string;
  /** Learner preferences (explanation style, depth, pace, difficulty). The demo tutor ignores them; the real backend will use them to shape prompts. */
  preferences?: LearnerPreferences;
};
export type TutorReply = { text: string; source: "demo" | "gemini"; conceptId: string | null };

export async function askTutor(req: TutorRequest, concepts: Concept[]): Promise<TutorReply> {
  await new Promise((r) => setTimeout(r, 350)); // simulates latency so loading states are real
  const concept = concepts.find((c) => c.id === req.conceptId) ?? null;
  const t = concept ? CONCEPT_TUTOR[concept.id] : undefined;
  if (concept && !t) {
    return { source: "demo", conceptId: concept.id, text: `Demonstration mode has no canned explanation for ${concept.name} yet. Concept summary: ${concept.explanation}` };
  }
  if (!concept || !t) {
    return { source: "demo", conceptId: null, text: "This is a demonstration reply. No concept map exists for this subject yet, so the tutor cannot tailor an explanation. Once material is processed, answers will be grounded in your material and concepts." };
  }
  const body = { answer: t.overview, simpler: t.simpler, steps: t.steps, example: t.example, analogy: t.analogy }[req.mode];
  const prefix = req.mode === "answer" && req.question ? `You asked: “${req.question}”. In demonstration mode I cannot read your question, so here is the overview of ${concept.name}: ` : "";
  return { source: "demo", conceptId: concept.id, text: prefix + body };
}

export function practiceFor(conceptId: string | null): PracticeQuestion[] {
  return PRACTICE.filter((q) => q.conceptId === conceptId);
}

export type GradeResult = { correct: boolean; explanation: string; possibleCause?: string };
/** Local, deterministic grading. Works with no AI service (required by the product spec). */
export function gradeAnswer(q: PracticeQuestion, optionId: string): GradeResult {
  const correct = optionId === q.correctId;
  return { correct, explanation: q.explanation, possibleCause: correct ? undefined : q.possibleCause?.[optionId] };
}
