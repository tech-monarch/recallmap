"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, ArrowUpRight, TrendingUp } from "lucide-react";
import { AccuracyBar, DemoBadge, Drawer, EmptyState, PageHeader, SegBar, StateChip, StateGlyph, StateRing } from "@/components/recallmap/shared";
import { btnPrimary, btnSecondary, cardTitle, eyebrow } from "@/components/recallmap/styles";
import { useLibrary } from "@/lib/recallmap/library-store";
import { DEMO_LEARNER_DATA, EMPTY_LEARNER_DATA } from "@/lib/recallmap/demo-history";
import { STATE_META } from "@/lib/recallmap/state";
import { accentFor } from "@/lib/recallmap/accent";
import { ACTIVITY_LABEL, allActivities } from "@/lib/recallmap/history";
import {
  accuracy, completedRetentionChecks, conceptProgress, hasAnyEvidence, improvedConcepts, recommendedActivities,
  subjectProgress, trendsOverTime, uncertainConcepts, MIN_QUESTIONS_FOR_CONFIDENCE,
  type UncertaintyReason,
} from "@/lib/recallmap/progress";
import type { AssessmentAttempt, UnderstandingState } from "@/lib/recallmap/types";

const card = "rounded-[24px] border border-line bg-card p-5";
const tap = "rm-lift cursor-pointer text-left";

/** How a number came to exist. Never blur these together. */
const BASIS = {
  measured: { label: "Measured", cls: "border-ok-line bg-ok-soft text-ok-ink", tip: "Counted from questions you answered." },
  estimated: { label: "Estimated", cls: "border-dashed border-amber-line bg-amber-soft text-amber-ink", tip: "Inferred, not confirmed by answers." },
  none: { label: "No data", cls: "border-dashed border-idle-line bg-idle-soft text-ink-2", tip: "Nothing assessed yet." },
} as const;
function Basis({ kind }: { kind: keyof typeof BASIS }) {
  const b = BASIS[kind];
  return <span title={b.tip} className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 font-ui text-xs font-semibold ${b.cls}`}>{b.label}</span>;
}

const result = (a: Pick<AssessmentAttempt, "correct" | "total">) => `${a.correct} of ${a.total} correct`;
const pct = (a: Pick<AssessmentAttempt, "correct" | "total">) => `${Math.round((accuracy(a) ?? 0) * 100)}%`;
const REASON: Record<UncertaintyReason, string> = {
  "not-assessed": "Not yet assessed. This is missing data, not a weakness.",
  "limited-evidence": `Fewer than ${MIN_QUESTIONS_FOR_CONFIDENCE} scored questions, so tentative.`,
  "unconfirmed-inference": "A possible misconception was inferred, not confirmed.",
};
const kindLabel = (k: AssessmentAttempt["kind"]) => (k === "retention-check" ? ACTIVITY_LABEL["retention-check"] : k === "follow-up" ? "Follow-up" : "Assessment");
const ORDER: UnderstandingState[] = ["demonstrated", "partial", "suspected-gap", "not-assessed"];

type Panel = { kind: "assessed" | "questions" | "gaps" | "retention" | "uncertain" } | { kind: "concept"; id: string };

function StatCard({ label, value, note, feature, onClick }: { label: string; value: string; note: string; feature?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-haspopup="dialog"
      className={`${tap} group relative flex flex-col p-5 ${feature ? "rounded-[24px] bg-brand text-white hover:bg-brand-deep hover:border-brand-deep" : "rounded-2xl border border-line bg-card"} ${feature ? "border border-brand" : ""}`}>
      <ArrowUpRight aria-hidden className={`absolute right-4 top-4 h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 ${feature ? "text-white" : "text-ink-3 group-hover:text-brand"}`} />
      <span className={`font-ui text-sm font-semibold ${feature ? "text-white" : "text-ink-2"}`}>{label}</span>
      <span className={`mt-2 font-ui text-[32px] font-bold leading-none tracking-[-0.02em] tabular-nums ${feature ? "text-white" : "text-ink"}`}>{value}</span>
      <span className={`mt-2 text-[13px] ${feature ? "text-white" : "text-ink-3"}`}>{note}</span>
    </button>
  );
}

export default function ProgressView() {
  const { subjects, materials, isDemo } = useLibrary();
  const [picked, setPicked] = useState<string | null>(null);
  const [filter, setFilter] = useState<UnderstandingState | null>(null);
  const [panel, setPanel] = useState<Panel | null>(null);
  const params = useSearchParams();
  const requested = params?.get("subject") ?? null;
  const data = isDemo ? DEMO_LEARNER_DATA : EMPTY_LEARNER_DATA;
  const subjectIds = subjects.map((s) => s.id);
  const subjectSet = new Set(subjectIds);
  const nameOf = (id: string) => data.concepts.find((c) => c.id === id)?.name ?? id;
  const header = <PageHeader title="My Progress" description="What your answers show. Study time is not counted." actions={isDemo ? <DemoBadge /> : undefined} />;

  if (!hasAnyEvidence(data)) {
    return (
      <div>
        {header}
        <EmptyState icon={TrendingUp} title="Not enough assessment evidence yet"
          body="Progress comes from questions you answer. Complete a short check in a study session and results will appear here."
          action={<Link href="/dashboard/sessions" className={btnPrimary}>Open a study session</Link>} />
      </div>
    );
  }

  const selectedId = [picked, requested].find((x) => x && subjectSet.has(x)) ?? subjects[0]?.id;
  const selected = subjects.find((s) => s.id === selectedId) ?? subjects[0];
  const selSp = subjectProgress(data, selected.id);
  const inSubject = (conceptId: string) => data.concepts.find((c) => c.id === conceptId)?.subjectId === selected.id;
  const attempts = data.attempts.filter((a) => a.total > 0 && inSubject(a.conceptId)).sort((x, y) => x.sequence - y.sequence);
  const { changes, singleAttempt } = trendsOverTime(data);
  const subjChanges = changes.filter((c) => c.concept.subjectId === selected.id);
  const improved = improvedConcepts(data).filter((c) => c.concept.subjectId === selected.id);
  const uncertain = uncertainConcepts(data).filter((u) => subjectSet.has(u.concept.subjectId));
  const retained = completedRetentionChecks(data);
  const retentionRecs = recommendedActivities(data).filter((a) => a.type === "retention-check");
  const reviewNext = recommendedActivities(data).filter((a) => a.subjectId === selected.id).slice(0, 3);
  const timeline = allActivities(data).filter((a) => a.status === "completed" && a.subjectId === selected.id).slice(0, 5);
  const matFor = (subjectId: string) => materials.find((m) => m.subjectId === subjectId)?.id;
  const all = data.concepts.filter((c) => subjectSet.has(c.subjectId)).map((c) => conceptProgress(data, c));
  const scoredQ = all.reduce((n, c) => n + c.questions, 0);
  const scoredC = all.reduce((n, c) => n + c.correct, 0);
  const gaps = all.filter((c) => c.state === "suspected-gap");
  const assessedN = all.filter((c) => c.state !== "not-assessed").length;
  const allAttempts = data.attempts.filter((a) => a.total > 0 && subjectSet.has(data.concepts.find((c) => c.id === a.conceptId)?.subjectId ?? "")).sort((x, y) => y.sequence - x.sequence);
  const evidenceFor = (id: string) => data.states.find((s) => s.conceptId === id)?.evidence ?? [];
  const checkLink = (conceptId: string, subjectId: string) => matFor(subjectId) && `/dashboard/sessions?material=${matFor(subjectId)}&concept=${conceptId}#practice`;
  const pickState = (s: UnderstandingState) => setFilter((f) => (f === s ? null : s));

  const conceptLink = (id: string) => <button type="button" onClick={() => setPanel({ kind: "concept", id })} className="font-semibold text-brand-text underline-offset-2 hover:underline">{nameOf(id)}</button>;

  function renderPanel(p: Panel) {
    if (p.kind === "concept") {
      const cp = all.find((c) => c.concept.id === p.id);
      if (!cp) return null;
      const ev = evidenceFor(p.id);
      const link = checkLink(p.id, cp.concept.subjectId);
      return (
        <Drawer title={cp.concept.name} subtitle={cp.concept.topic} onClose={() => setPanel(null)}>
          <div className="flex flex-wrap items-center gap-2"><StateChip state={cp.state} /><Basis kind={cp.basis} /></div>
          <p className="text-base leading-relaxed">{cp.concept.explanation}</p>
          <p className="text-ink-2"><span className="font-semibold text-ink">Builds on:</span> {cp.concept.prerequisites.length ? cp.concept.prerequisites.map(nameOf).join(", ") : "Nothing else"}</p>
          <div>
            <h4 className="mb-2 font-bold">Attempts</h4>
            {cp.attempts.length === 0 ? <p className="text-ink-2">None yet. Nothing to measure.</p> : (
              <ul className="space-y-3">{cp.attempts.map((a) => (
                <li key={a.id}><div className="flex justify-between gap-3"><span className="text-ink-2">{kindLabel(a.kind)}, demo step {a.sequence}</span><span className="font-semibold">{result(a)}</span></div><div className="mt-1.5"><AccuracyBar correct={a.correct} total={a.total} /></div></li>
              ))}</ul>
            )}
          </div>
          {ev.length > 0 && <div><h4 className="mb-2 font-bold">Evidence</h4><ul className="space-y-2 text-ink-2">{ev.map((e) => <li key={e.id}><span className="font-semibold text-ink">{e.kind === "inferred-misconception" ? "Inferred" : "Observed"}:</span> {e.summary}</li>)}</ul></div>}
          <div className="flex flex-wrap gap-2 pt-1">
            {link && <Link href={link} className={btnPrimary}>Take a check</Link>}
            <Link href={`/dashboard/map?concept=${p.id}`} className={btnSecondary}>Open in map</Link>
          </div>
        </Drawer>
      );
    }
    if (p.kind === "assessed") {
      return (
        <Drawer title="Concepts assessed" subtitle={`${assessedN} of ${all.length}`} onClose={() => setPanel(null)}>
          {ORDER.map((st) => {
            const list = all.filter((c) => c.state === st);
            if (!list.length) return null;
            return <div key={st}><h4 className="mb-2 flex items-center gap-2 font-bold"><StateGlyph state={st} size={13} />{STATE_META[st].label} <span className="font-medium text-ink-3">{list.length}</span></h4><ul className="space-y-1.5">{list.map((c) => <li key={c.concept.id}>{conceptLink(c.concept.id)} <span className="text-ink-3">{subjects.find((s) => s.id === c.concept.subjectId)?.name}</span></li>)}</ul></div>;
          })}
        </Drawer>
      );
    }
    if (p.kind === "questions") {
      return (
        <Drawer title="Questions answered" subtitle={`${scoredC} of ${scoredQ} correct, newest first`} onClose={() => setPanel(null)}>
          <ul className="space-y-4">{allAttempts.map((a) => (
            <li key={a.id}><div className="flex justify-between gap-3"><span>{conceptLink(a.conceptId)} <span className="text-ink-3">{kindLabel(a.kind)}</span></span><span className="font-semibold">{result(a)}</span></div><div className="mt-1.5"><AccuracyBar correct={a.correct} total={a.total} /></div></li>
          ))}</ul>
          <p className="text-sm text-ink-3">Small question counts are tentative.</p>
        </Drawer>
      );
    }
    if (p.kind === "gaps") {
      return (
        <Drawer title="Suspected gaps" subtitle="Inferences, not verdicts" onClose={() => setPanel(null)}>
          {gaps.length === 0 ? <p className="text-ink-2">None with evidence.</p> : <ul className="space-y-3">{gaps.map((g) => (
            <li key={g.concept.id} className="rounded-xl border border-bad-line bg-bad-soft p-3.5"><p>{conceptLink(g.concept.id)}</p><p className="mt-0.5 text-ink-2">{evidenceFor(g.concept.id)[0]?.summary}</p></li>
          ))}</ul>}
          <Link href="/dashboard/gaps" className="inline-block font-ui font-semibold text-brand-text hover:underline">Open Knowledge Gaps</Link>
        </Drawer>
      );
    }
    if (p.kind === "retention") {
      return (
        <Drawer title="Retention checks" subtitle="Re-asking what you already showed" onClose={() => setPanel(null)}>
          <div><h4 className="mb-2 font-bold">Completed</h4>
            {retained.length === 0 ? <p className="text-ink-2">None yet, so retention is unknown, not poor.</p> : <ul className="space-y-2">{retained.map(({ attempt, concept }) => <li key={attempt.id}>{concept.name}: {result(attempt)} <Basis kind="measured" /></li>)}</ul>}
          </div>
          <div><h4 className="mb-2 font-bold">Recommended, not done</h4>
            {retentionRecs.length === 0 ? <p className="text-ink-2">Nothing to review right now.</p> : <ul className="space-y-2">{retentionRecs.map((r) => <li key={r.id} className="rounded-xl border border-dashed border-line-strong px-3.5 py-2.5">{r.title}<p className="text-sm text-ink-2">{r.reason}</p></li>)}</ul>}
            <p className="mt-2 text-sm text-ink-3">No due dates are shown because no real timestamps exist yet.</p>
          </div>
        </Drawer>
      );
    }
    return (
      <Drawer title="Still uncertain" subtitle={`${uncertain.length} concept${uncertain.length === 1 ? "" : "s"}`} onClose={() => setPanel(null)}>
        {uncertain.length === 0 ? <p className="text-ink-2">Every concept has enough evidence for now.</p> : (
          <ul className="space-y-3">{uncertain.map(({ concept, state, reasons }) => (
            <li key={concept.id} className="rounded-xl border border-line p-3.5">
              <div className="flex items-center justify-between gap-2">{conceptLink(concept.id)}<StateChip state={state} /></div>
              <ul className="mt-1.5 space-y-0.5 text-sm text-ink-2">{reasons.map((r) => <li key={r}>{REASON[r]}</li>)}</ul>
              {checkLink(concept.id, concept.subjectId) && <Link href={checkLink(concept.id, concept.subjectId)!} className="mt-2 inline-block font-ui text-sm font-semibold text-brand-text hover:underline">Take a check</Link>}
            </li>
          ))}</ul>
        )}
      </Drawer>
    );
  }

  const shownTopics = selSp.topics.map((t) => ({ ...t, concepts: t.concepts.filter((c) => !filter || c.state === filter) })).filter((t) => t.concepts.length > 0);

  return (
    <div className="space-y-8">
      {header}

      <section aria-label="Progress summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard feature label="Concepts assessed" value={`${assessedN}/${all.length}`} note="View by state" onClick={() => setPanel({ kind: "assessed" })} />
        <StatCard label="Questions answered" value={String(scoredQ)} note={`${scoredC} correct`} onClick={() => setPanel({ kind: "questions" })} />
        <StatCard label="Suspected gaps" value={String(gaps.length)} note="See evidence" onClick={() => setPanel({ kind: "gaps" })} />
        <StatCard label="Retention checks" value={String(retained.length)} note="Completed" onClick={() => setPanel({ kind: "retention" })} />
      </section>

      <ul className="-mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5" aria-label="How to read the labels on this page">
        {(Object.keys(BASIS) as (keyof typeof BASIS)[]).map((k) => <li key={k}><Basis kind={k} /><span className="sr-only"> {BASIS[k].tip}</span></li>)}
      </ul>

      <section aria-labelledby="by-subject" className="space-y-4">
        <h3 id="by-subject" className={cardTitle}>Subjects</h3>
        <div className="grid gap-4 sm:grid-cols-2" role="group" aria-label="Choose a subject">
          {subjects.map((s) => {
            const sp = subjectProgress(data, s.id);
            const a = accentFor(subjectIds, s.id);
            const on = s.id === selected.id;
            return (
              <button key={s.id} type="button" aria-pressed={on} onClick={() => { setPicked(s.id); setFilter(null); }}
                className={`w-full rounded-3xl border-2 p-5 text-left transition-all duration-200 ${on ? "border-brand bg-brand-soft" : "rm-lift border-line bg-card"}`}>
                <span className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-3">
                    <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-[14px] font-ui text-base font-bold" style={{ background: on ? "var(--card)" : a.soft, color: a.text }}>{s.name.slice(0, 1)}</span>
                    <span role="heading" aria-level={4} className="font-ui text-lg font-bold text-ink">{s.name}</span>
                  </span>
                  {sp.total > 0 && <span className="text-sm text-ink-2">{sp.assessed} of {sp.total} assessed</span>}
                </span>
                {sp.total === 0 ? (
                  <span className="mt-3 block text-base text-ink-2">No concept map yet, so nothing to measure.</span>
                ) : (
                  <>
                    <span className="mt-4 block"><SegBar counts={sp.counts} total={sp.total} name={s.name} /></span>
                    <span className="mt-3 block text-[15px] text-ink">{sp.counts.demonstrated} demonstrated · {sp.counts.partial} partial · {sp.counts["suspected-gap"]} gap · {sp.counts["not-assessed"]} not assessed</span>
                    <span className="mt-1 block text-[13px] text-ink-3">Unassessed concepts are not counted as weak.</span>
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Explorer: ring filters the concept grid */}
        <div key={selected.id} className="rm-enter grid gap-5 pt-2 lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className={`${card} flex flex-col items-center`}>
            <StateRing counts={selSp.counts} total={selSp.total} active={filter} onPick={pickState} size={164}>
              <span className="font-ui text-[26px] font-bold leading-none tabular-nums text-ink">{selSp.assessed}<span className="text-ink-3">/{selSp.total}</span></span>
              <span className="mt-1 text-[13px] text-ink-2">assessed</span>
            </StateRing>
            <div role="group" aria-label="Filter concepts by state" className="mt-5 w-full space-y-1.5">
              {ORDER.map((s) => (
                <button key={s} type="button" aria-pressed={filter === s} onClick={() => pickState(s)} disabled={selSp.counts[s] === 0}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-[15px] transition-colors ${filter === s ? "bg-brand-soft font-semibold text-brand-text" : "text-ink-2 hover:bg-canvas hover:text-ink"} disabled:opacity-50`}>
                  <span className="flex items-center gap-2.5"><StateGlyph state={s} size={13} /><span>{STATE_META[s].label}</span></span>
                  <span className="font-ui font-bold tabular-nums">{selSp.counts[s]}</span>
                </button>
              ))}
            </div>
            {filter && <button type="button" onClick={() => setFilter(null)} className="mt-3 font-ui text-sm font-semibold text-brand-text hover:underline">Show all concepts</button>}
          </div>

          <div role="region" aria-label={`${selected.name} concepts`} className="min-w-0">
            {selSp.total === 0 ? <p className="text-base text-ink-2">No concepts yet.</p> : (
              <div className="space-y-5">
                {shownTopics.map((t) => (
                  <div key={t.topic}>
                    <h5 className={`${eyebrow} mb-2.5`}>{t.topic}</h5>
                    <ul className="grid gap-3 sm:grid-cols-2">
                      {t.concepts.map((cp) => (
                        <li key={cp.concept.id}>
                          <button type="button" onClick={() => setPanel({ kind: "concept", id: cp.concept.id })} aria-haspopup="dialog" aria-label={`${cp.concept.name}, ${STATE_META[cp.state].label}`}
                            className={`${tap} flex w-full flex-col gap-2 rounded-2xl border bg-card px-4 py-3.5 ${cp.state === "not-assessed" ? "border-dashed border-line-strong" : "border-line"}`}>
                            <span className="flex items-center justify-between gap-2"><span className="truncate font-ui text-[15px] font-semibold text-ink">{cp.concept.name}</span><StateGlyph state={cp.state} size={14} /></span>
                            <span className="text-[13px] text-ink-2">{cp.basis === "measured" ? `${cp.correct} of ${cp.questions} correct` : cp.basis === "estimated" ? "State recorded, no score" : "Not yet assessed"}</span>
                            {cp.basis === "measured" ? <AccuracyBar correct={cp.correct} total={cp.questions} /> : <span className="h-2 rounded-full border border-dashed border-idle-line" />}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="results" className={card}>
        <h3 id="results" className={cardTitle}>Assessment results</h3>
        <p className="mt-0.5 text-[15px] text-ink-2">{selected.name}, in order. Select a bar for details.</p>
        {attempts.length === 0 ? <p className="mt-3 text-base text-ink-2">No scored attempts yet.</p> : (
          <div className="mt-5 overflow-x-auto pb-1">
            <ol className="flex min-w-max items-end gap-2">
              {attempts.map((a) => (
                <li key={a.id}>
                  <button type="button" onClick={() => setPanel({ kind: "concept", id: a.conceptId })} aria-haspopup="dialog" aria-label={`${nameOf(a.conceptId)}, ${kindLabel(a.kind)}, ${result(a)}`} title={`${nameOf(a.conceptId)}: ${result(a)}`}
                    className="group flex w-[88px] flex-col items-center gap-2 rounded-2xl p-2 transition-colors hover:bg-brand-soft">
                    <span className="font-ui text-sm font-bold tabular-nums text-ink">{a.correct}/{a.total}</span>
                    <span className="flex h-28 w-9 items-end overflow-hidden rounded-full bg-idle-soft"><span className="rm-grow block w-full rounded-full bg-brand transition-colors group-hover:bg-brand-deep" style={{ height: `${Math.max((accuracy(a) ?? 0) * 100, 6)}%` }} /></span>
                    <span className="w-full truncate text-center text-[13px] font-semibold text-ink">{nameOf(a.conceptId)}</span>
                    <span className="text-xs text-ink-3">{a.kind === "retention-check" ? "Retention" : a.kind === "follow-up" ? "Follow-up" : `Step ${a.sequence}`}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-5">
        <section aria-label="Review next" className="rounded-[24px] bg-brand-soft p-6 lg:col-span-3">
          <h3 className={cardTitle}>Review next</h3>
          {reviewNext.length === 0 ? <p className="mt-3 text-base text-ink-2">Nothing to review right now.</p> : (
            <ul className="mt-3 space-y-2.5">
              {reviewNext.map((r) => {
                const link = checkLink(r.conceptIds[0], r.subjectId);
                return (
                  <li key={r.id} className="flex items-center gap-3 rounded-xl bg-card px-4 py-3">
                    <div className="min-w-0 flex-1"><p className="truncate font-ui text-[15px] font-semibold text-ink">{r.title}</p><p className="text-[13px] text-ink-2">{r.reason}</p></div>
                    {link && <Link href={link} className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-brand px-4 font-ui text-sm font-semibold text-white transition-colors hover:bg-brand-deep">Start <ArrowRight className="h-3.5 w-3.5" /></Link>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-label="Activity timeline" className="rounded-[24px] border border-line bg-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between"><h3 className={cardTitle}>Activity</h3><Link href="/dashboard/history" className="font-ui text-sm font-semibold text-brand-text hover:underline">History</Link></div>
          {timeline.length === 0 ? <p className="mt-3 text-base text-ink-2">No completed activity in this subject.</p> : (
            <ol className="relative mt-4 space-y-3.5 before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-px before:bg-line-strong">
              {timeline.map((a) => (
                <li key={a.id} className="relative flex items-start gap-3.5">
                  <span aria-hidden className="relative z-10 mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full border-2 border-brand bg-card" />
                  <div className="min-w-0"><p className="truncate font-ui text-sm font-semibold text-ink">{a.title}</p><p className="text-[13px] text-ink-3">{ACTIVITY_LABEL[a.type]}, demo step {a.sequence}</p></div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <section aria-labelledby="over-time" className={card}>
          <h3 id="over-time" className={cardTitle}>Change over time</h3>
          <p className="mt-0.5 text-[13px] text-ink-3">First vs latest attempt. Needs two or more.</p>
          {subjChanges.length === 0 ? (
            <p className="mt-3 text-base text-ink-2">No concept here has been assessed twice yet, so no change can be reported.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {subjChanges.map(({ concept, trend }) => (
                <li key={concept.id} className="text-[15px]">
                  <p className="font-ui font-semibold text-ink">{concept.name}</p>
                  <p><span>{result(trend.first)} → {result(trend.latest)}</span> <span className="text-ink-2">({trend.kind === "improved" ? "improved" : trend.kind === "declined" ? "lower" : "about the same"}, {trend.attemptCount} attempts)</span></p>
                  <div className="mt-2 grid gap-1.5"><AccuracyBar correct={trend.first.correct} total={trend.first.total} color="var(--idle)" /><AccuracyBar correct={trend.latest.correct} total={trend.latest.total} /></div>
                </li>
              ))}
            </ul>
          )}
          {singleAttempt > 0 && <p className="mt-4 text-[13px] text-ink-3">{singleAttempt} other assessed concept{singleAttempt === 1 ? " has" : "s have"} only one attempt, so there is no trend to show.</p>}
        </section>

        <section aria-labelledby="improved" className={card}>
          <h3 id="improved" className={cardTitle}>Previously weak, now improved</h3>
          <p className="mt-0.5 text-[13px] text-ink-3">First attempt under 50%, latest clearly higher.</p>
          {improved.length === 0 ? (
            <p className="mt-3 text-base text-ink-2">None yet.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {improved.map(({ concept, trend }) => {
                const cp = conceptProgress(data, concept);
                return (
                  <li key={concept.id} className="text-[15px] text-ink">
                    <p><span className="font-ui font-semibold">{concept.name}</span>: {pct(trend.first)} → {pct(trend.latest)} <Basis kind="measured" /></p>
                    <p className="mt-1 text-[13px] text-ink-2">From {trend.first.total} and {trend.latest.total} questions. Improved is not the same as mastered{cp.state !== "demonstrated" ? `, still ${STATE_META[cp.state].label.toLowerCase()}` : ""}.</p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <button type="button" onClick={() => setPanel({ kind: "uncertain" })} aria-haspopup="dialog" className={`${tap} group flex flex-col rounded-[24px] border border-line bg-card p-5`}>
          <span className="flex items-start justify-between"><span className={cardTitle}>Still uncertain</span><ArrowUpRight aria-hidden className="h-4 w-4 text-ink-3 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand" /></span>
          <span className="mt-4 font-ui text-[40px] font-bold leading-none tabular-nums text-ink">{uncertain.length}</span>
          <span className="mt-2 text-[15px] text-ink-2">Concepts that need more evidence. Select to see why.</span>
        </button>
      </div>

      {panel && renderPanel(panel)}
    </div>
  );
}
