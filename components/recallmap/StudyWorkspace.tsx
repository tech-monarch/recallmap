"use client";

import { useMemo, useRef, useState } from "react";
import { usePreferences } from "@/lib/recallmap/preferences-store";
import { preferredTutorModes } from "@/lib/recallmap/preferences";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Network, Send } from "lucide-react";
import { DEMO_CONCEPTS, DEMO_LEARNER_STATES } from "@/lib/recallmap/demo-data";
import { DEMO_MATERIAL_TEXT, type TutorMode } from "@/lib/recallmap/demo-tutor";
import { askTutor, gradeAnswer, practiceFor, type GradeResult } from "@/lib/recallmap/tutor";
import type { LibraryMaterial } from "@/lib/recallmap/library-store";
import { DemoBadge, StateChip } from "@/components/recallmap/shared";
import CodeText from "@/components/recallmap/CodeText";
import { btnPrimary, eyebrow, field } from "@/components/recallmap/styles";

type Msg = { id: number; role: "learner" | "tutor"; text: string; demo?: boolean; mode?: TutorMode };

/** Tutor replies differ by a quiet label and edge, not by loud colour: explanations are plain, examples sit on a soft blue surface. */
const KIND: Record<TutorMode, { label: string; box: string }> = {
  answer: { label: "Explanation", box: "border-l-brand bg-card" },
  simpler: { label: "Simpler", box: "border-l-brand bg-card" },
  steps: { label: "Step by step", box: "border-l-brand bg-card" },
  example: { label: "Example", box: "border-l-brand-deep bg-brand-soft" },
  analogy: { label: "Analogy", box: "border-l-ink-3 bg-canvas" },
};

const QUICK: { mode: Exclude<TutorMode, "answer">; label: string; ask: string }[] = [
  { mode: "simpler", label: "Explain more simply", ask: "Explain it more simply" },
  { mode: "steps", label: "Step by step", ask: "Walk me through it step by step" },
  { mode: "example", label: "Give an example", ask: "Give me an example" },
  { mode: "analogy", label: "Use an analogy", ask: "Give me an analogy" },
];

export default function StudyWorkspace({ material, subjectName, initialConcept = null }: { material: LibraryMaterial; subjectName: string; initialConcept?: string | null }) {
  const concepts = useMemo(() => DEMO_CONCEPTS.filter((c) => c.subjectId === material.subjectId), [material.subjectId]);
  const stateOf = (id: string) => DEMO_LEARNER_STATES.find((s) => s.conceptId === id)?.state ?? "not-assessed";
  const initial = concepts.find((c) => c.id === initialConcept)?.id ?? concepts.find((c) => stateOf(c.id) === "suspected-gap")?.id ?? concepts[0]?.id ?? null;

  const { saved } = usePreferences();
  const preferredModes = preferredTutorModes(saved);
  const [tab, setTab] = useState<"material" | "tutor">("material");
  const [focus, setFocus] = useState<string | null>(initial);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const [qIndex, setQIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [result, setResult] = useState<GradeResult | null>(null);
  const idRef = useRef(0);

  const concept = concepts.find((c) => c.id === focus) ?? null;
  const questions = practiceFor(focus);
  const q = questions[qIndex % Math.max(questions.length, 1)];
  const sections = DEMO_MATERIAL_TEXT[material.id] ?? (material.content ? [{ heading: material.title, body: material.content }] : null);

  async function ask(mode: TutorMode, label: string, question?: string) {
    setError("");
    setMsgs((m) => [...m, { id: ++idRef.current, role: "learner", text: label }]);
    setPending(true);
    setTab("tutor");
    try {
      const r = await askTutor({ subjectId: material.subjectId, materialId: material.id, conceptId: focus, mode, question, preferences: saved }, concepts);
      setMsgs((m) => [...m, { id: ++idRef.current, role: "tutor", text: r.text, demo: r.source === "demo", mode }]);
    } catch {
      setError("The tutor could not respond. Your material and progress are unaffected.");
    } finally {
      setPending(false);
    }
  }

  function changeFocus(id: string) {
    setFocus(id); setQIndex(0); setPicked(null); setResult(null);
  }

  function submit() {
    if (!q || !picked) return;
    setResult(gradeAnswer(q, picked));
  }
  function nextQuestion() {
    setQIndex((i) => i + 1); setPicked(null); setResult(null);
  }

  const panel = "rounded-[24px] border border-line bg-card";
  const chip = "rounded-full border border-line-strong bg-card px-3.5 py-1.5 font-ui text-[13px] font-semibold text-ink transition-colors hover:border-brand hover:bg-brand-soft hover:text-brand-text disabled:opacity-50";

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <Link href="/dashboard/sessions" className="inline-flex items-center gap-1.5 font-ui text-sm font-semibold text-brand-text hover:underline"><ArrowLeft className="h-3.5 w-3.5" />All sessions</Link>
          <h1 className="mt-1 truncate font-ui text-[24px] font-bold tracking-[-0.02em] text-ink">{material.title}</h1>
          <p className="text-[15px] text-ink-2">{subjectName}</p>
        </div>
        <DemoBadge label="Tutor: demonstration responses, no AI connected" />
      </div>

      <div className="mb-4 flex gap-1 rounded-full border border-line bg-card p-1 lg:hidden" role="tablist" aria-label="Study panels">
        {(["material", "tutor"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`flex-1 rounded-full px-3 py-2 font-ui text-sm font-semibold ${tab === t ? "bg-brand text-white" : "text-ink-2 hover:text-ink"}`}>{t === "material" ? "Material" : "Tutor"}</button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* Reading surface: Source Sans 3, 18px, generous leading */}
        <section aria-label="Material" className={`${panel} px-5 py-6 sm:px-8 ${tab === "material" ? "" : "hidden lg:block"} lg:max-h-[72vh] lg:overflow-auto`}>
          {sections ? (
            sections.map((s) => (
              <article key={s.heading} className="mb-9 last:mb-0">
                <h3 className="font-ui text-xl font-bold tracking-[-0.02em] text-ink">{s.heading}</h3>
                <div className="mt-3 max-w-[66ch] space-y-3.5 font-reading">
                  <CodeText text={s.body} proseClass="text-[17px] leading-[1.75] text-ink" />
                </div>
              </article>
            ))
          ) : (
            <p className="text-base text-ink-2">This material has not been processed, so its content cannot be shown here yet. PDF reading arrives with the document-processing backend.</p>
          )}
        </section>

        {/* Tutor */}
        <section aria-label="Tutor" className={`${panel} flex flex-col ${tab === "tutor" ? "" : "hidden lg:flex"} lg:max-h-[72vh]`}>
          <div className="border-b border-line p-5">
            {concepts.length === 0 ? (
              <p className="text-[15px] text-ink-2">No concept map for this subject yet. The tutor will give general demonstration replies.</p>
            ) : (
              <>
                <p className={eyebrow}>Studying concept</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {concepts.map((c) => (
                    <button key={c.id} onClick={() => changeFocus(c.id)} aria-pressed={c.id === focus} className={`rounded-full border px-3.5 py-1.5 font-ui text-[13px] font-semibold ${c.id === focus ? "border-brand bg-brand text-white" : "border-line-strong bg-card text-ink hover:border-brand hover:text-brand-text"}`}>{c.name}</button>
                  ))}
                </div>
                {concept && (
                  <div className="mt-4 text-[15px] text-ink-2">
                    <div className="flex flex-wrap items-center gap-2"><StateChip state={stateOf(concept.id)} /><span className="text-[13px]">Demonstration state</span>
                      <Link href={`/dashboard/map?concept=${concept.id}`} className="ml-auto inline-flex items-center gap-1.5 font-ui text-sm font-semibold text-brand-text hover:underline"><Network className="h-3.5 w-3.5" />View on map</Link></div>
                    {concept.prerequisites.length > 0 && (
                      <p className="mt-3">Builds on:{" "}{concept.prerequisites.map((p) => { const pc = concepts.find((c) => c.id === p); return pc ? <button key={p} onClick={() => changeFocus(p)} className="mr-2 font-semibold text-brand-text underline underline-offset-2">{pc.name}</button> : null; })}</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="min-h-44 flex-1 space-y-3 overflow-auto p-5" aria-live="polite">
            {msgs.length === 0 && <p className="text-base text-ink-2">Ask a question or use a quick action. Replies are demo responses.</p>}
            {msgs.map((m) => (
              <div key={m.id} className={m.role === "learner" ? "flex justify-end" : ""}>
                {m.role === "learner" ? (
                  <div className="rm-pop max-w-[88%] rounded-[20px] rounded-br-md bg-brand px-4 py-2.5 text-base text-white">{m.text}</div>
                ) : (
                  <div className={`rm-enter max-w-[94%] rounded-2xl rounded-bl-md border border-line border-l-[3px] px-4 py-3.5 ${KIND[m.mode ?? "answer"].box}`}>
                    <p className="mb-1 font-ui text-xs font-bold uppercase tracking-[0.1em] text-brand-text">{KIND[m.mode ?? "answer"].label}</p>
                    <p className="font-reading text-[16px] leading-[1.7] text-ink">{m.text}</p>
                    {m.demo && <p className="mt-2 text-[13px] text-ink-3">Demo response, not from Gemini</p>}
                  </div>
                )}
              </div>
            ))}
            {pending && <p className="rm-dots flex items-center gap-1 text-ink-3" aria-label="The tutor is preparing a reply"><span className="h-1.5 w-1.5 rounded-full bg-ink-3" /><span className="h-1.5 w-1.5 rounded-full bg-ink-3" /><span className="h-1.5 w-1.5 rounded-full bg-ink-3" /></p>}
            {error && <p role="alert" className="text-sm font-semibold text-bad-ink">{error}</p>}
          </div>

          <div className="space-y-3 border-t border-line p-5">
            <div className="flex flex-wrap gap-1.5">
              <button className={chip} disabled={pending} onClick={() => ask("answer", `Explain ${concept?.name ?? "this"}`)}>Explain {concept?.name ?? "this"}</button>
              {QUICK.map((a) => <button key={a.mode} data-preferred={preferredModes.includes(a.mode) || undefined} title={preferredModes.includes(a.mode) ? "Matches your preferred explanation style" : undefined} className={chip + (preferredModes.includes(a.mode) ? " border-brand bg-brand-soft text-brand-text" : "")} disabled={pending} onClick={() => ask(a.mode, a.ask)}>{a.label}</button>)}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); const t = input.trim(); if (!t || pending) return; setInput(""); ask("answer", t, t); }} className="flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question or a follow-up" aria-label="Ask the tutor" className={`${field} min-w-0 flex-1`} />
              <button type="submit" disabled={pending || !input.trim()} aria-label="Send" className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-brand text-white transition-colors hover:bg-brand-deep disabled:opacity-40"><Send className="h-4 w-4" /></button>
            </form>
          </div>
        </section>
      </div>

      {/* Practice */}
      <section id="practice" aria-label="Practice" className={`${panel} mt-4 p-5 sm:p-7`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="font-ui text-lg font-bold tracking-[-0.015em] text-ink">Practice{concept ? `: ${concept.name}` : ""}</h3><span className="text-[13px] text-ink-3">Graded locally, not saved yet</span></div>
        {!q ? (
          <p className="mt-3 text-base text-ink-2">No practice questions for this concept yet.</p>
        ) : (
          <div className="mt-5 max-w-2xl">
            <div className="space-y-3 rounded-2xl bg-canvas p-5 font-reading">
              <CodeText text={q.prompt} proseClass="text-[17px] leading-[1.7] text-ink" codeClass="bg-card" />
            </div>
            <div className="mt-4 space-y-2" role="radiogroup" aria-label="Answer options">
              {q.options.map((o) => (
                <label key={o.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-base transition-colors ${picked === o.id ? "border-brand bg-brand-soft" : "border-line-strong bg-card hover:border-brand-line hover:bg-canvas"} ${result ? "cursor-default" : ""}`}>
                  <input type="radio" name={q.id} value={o.id} checked={picked === o.id} disabled={!!result} onChange={() => setPicked(o.id)} className="h-4 w-4 accent-brand" />{o.text}
                </label>
              ))}
            </div>
            {!result ? (
              <button onClick={submit} disabled={!picked} className={`${btnPrimary} mt-5`}>Submit answer</button>
            ) : (
              <div className={`rm-enter mt-5 rounded-2xl border border-l-[4px] bg-card p-5 ${result.correct ? "border-ok-line border-l-ok" : "border-line border-l-bad"}`} role="status">
                <p className={`font-ui text-base font-bold ${result.correct ? "text-ok-ink" : "text-bad-ink"}`}>{result.correct ? "Correct." : "That answer is incorrect."}</p>
                <p className="mt-1.5 font-reading text-[16px] leading-[1.7] text-ink">{result.explanation}</p>
                {result.possibleCause && <p className="mt-3 rounded-xl bg-canvas px-4 py-3 font-reading text-[16px] leading-[1.6] text-ink-2">{result.possibleCause}</p>}
                {!result.correct && <p className="mt-3 text-[13px] text-ink-3">A wrong answer shows what happened, not why. One question is not enough to conclude a gap.</p>}
                <button onClick={nextQuestion} className="mt-4 inline-flex items-center gap-1.5 font-ui text-sm font-semibold text-brand-text hover:underline">Next question <ArrowRight className="h-3.5 w-3.5" /></button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
