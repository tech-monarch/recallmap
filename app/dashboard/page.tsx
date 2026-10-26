"use client";

import Link from "next/link";
import { ArrowRight, ClipboardCheck, Dumbbell, GraduationCap, Library, RefreshCw, Repeat } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DemoBadge, EmptyState, PageHeader, SegBar, StateGlyph, StateRing } from "@/components/recallmap/shared";
import { btnPrimary, btnSecondary, cardTitle, panel } from "@/components/recallmap/styles";
import { useLibrary } from "@/lib/recallmap/library-store";
import { DEMO_LEARNER_DATA, EMPTY_LEARNER_DATA } from "@/lib/recallmap/demo-history";
import { accentFor } from "@/lib/recallmap/accent";
import { STATE_META } from "@/lib/recallmap/state";
import { useDisplayName, welcomeBack } from "@/lib/recallmap/user";
import { ACTIVITY_LABEL, allActivities } from "@/lib/recallmap/history";
import { conceptProgress, completedRetentionChecks, recommendedActivities, subjectProgress } from "@/lib/recallmap/progress";
import type { ActivityType, UnderstandingState } from "@/lib/recallmap/types";

const ICON: Record<ActivityType, LucideIcon> = { "study-session": GraduationCap, assessment: ClipboardCheck, "follow-up-assessment": RefreshCw, "retention-check": Repeat, practice: Dumbbell };
const ORDER: UnderstandingState[] = ["demonstrated", "partial", "suspected-gap", "not-assessed"];
const heroBtn = "inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 font-ui text-[15px] font-bold text-brand-deep transition-all duration-150 hover:-translate-y-px hover:bg-[#eaf2ff] active:translate-y-0";

export default function DashboardPage() {
  const { subjects, materials, isDemo } = useLibrary();
  const displayName = useDisplayName();

  if (subjects.length === 0) {
    return (
      <div>
        <PageHeader title="Welcome to RecallMap" description="Understand more. Remember what matters." />
        <EmptyState
          icon={Library}
          title="Add your first subject"
          body="Each subject gets its own knowledge map."
          action={<Link href="/dashboard/library" className={btnPrimary}>Open My Library <ArrowRight className="h-4 w-4" /></Link>}
        />
      </div>
    );
  }

  const data = isDemo ? DEMO_LEARNER_DATA : EMPTY_LEARNER_DATA;
  const ids = subjects.map((s) => s.id);
  const firstMaterial = materials[0];
  const subjectName = (id: string) => subjects.find((s) => s.id === id)?.name ?? id;
  const conceptName = (id: string) => data.concepts.find((c) => c.id === id)?.name ?? id;

  const cps = data.concepts.filter((c) => ids.includes(c.subjectId)).map((c) => conceptProgress(data, c));
  const counts: Record<UnderstandingState, number> = { demonstrated: 0, partial: 0, "suspected-gap": 0, "not-assessed": 0 };
  cps.forEach((c) => { counts[c.state] += 1; });
  const assessed = cps.length - counts["not-assessed"];
  const gaps = cps.filter((c) => c.state === "suspected-gap");
  const scoredQ = cps.reduce((n, c) => n + c.questions, 0);
  const scoredCorrect = cps.reduce((n, c) => n + c.correct, 0);
  const retention = completedRetentionChecks(data).length;
  const next = recommendedActivities(data).filter((r) => ids.includes(r.subjectId))[0];
  const recent = allActivities(data).filter((a) => a.status === "completed").slice(0, 4);
  const nextMaterial = next ? materials.find((m) => m.subjectId === next.subjectId)?.id ?? firstMaterial?.id ?? "" : "";

  const tiles = [
    { label: "Questions answered", value: String(scoredQ), note: scoredQ ? `${scoredCorrect} correct` : "None scored yet" },
    { label: "Suspected gaps", value: String(gaps.length), note: gaps.length ? "From your answers" : "None with evidence" },
    { label: "Retention checks", value: String(retention), note: retention ? "Completed" : "None yet" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={welcomeBack(displayName)} actions={isDemo ? <DemoBadge /> : undefined} />

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Continue learning: the primary feature panel */}
        <section aria-label="Continue learning" className="relative overflow-hidden rounded-[28px] bg-brand p-6 text-white sm:p-7 lg:col-span-3">
          <span aria-hidden className="absolute -right-14 -top-14 h-52 w-52 rounded-full bg-brand-deep" />
          <span aria-hidden className="absolute right-20 top-24 h-16 w-16 rotate-12 rounded-[20px] bg-brand-deep" />
          <div className="relative">
            <p className="font-ui text-[13px] font-bold uppercase tracking-[0.12em]">Up next</p>
            {next ? (
              <>
                <h3 className="mt-3 max-w-lg font-ui text-[24px] font-bold leading-[1.2] tracking-[-0.02em] sm:text-[26px]">{next.title}</h3>
                <p className="mt-2.5 max-w-md text-[16px] leading-relaxed">{next.summary}</p>
                <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
                  <Link href={`/dashboard/sessions?material=${nextMaterial}&concept=${next.conceptIds[0]}#practice`} className={heroBtn}>Continue learning <ArrowRight className="h-4 w-4" /></Link>
                  <Link href="/dashboard/gaps" className="font-ui text-[15px] font-semibold underline underline-offset-4 hover:no-underline">See the evidence</Link>
                </div>
              </>
            ) : firstMaterial ? (
              <>
                <h3 className="mt-3 max-w-lg font-ui text-[24px] font-bold leading-[1.2] tracking-[-0.02em] sm:text-[26px]">Start a study session</h3>
                <p className="mt-2.5 max-w-md text-[16px] leading-relaxed">Open “{firstMaterial.title}”. Nothing is judged yet.</p>
                <div className="mt-6"><Link href={`/dashboard/sessions?material=${firstMaterial.id}`} className={heroBtn}>Continue learning <ArrowRight className="h-4 w-4" /></Link></div>
              </>
            ) : (
              <>
                <h3 className="mt-3 max-w-lg font-ui text-[24px] font-bold leading-[1.2] tracking-[-0.02em] sm:text-[26px]">Add your first material</h3>
                <p className="mt-2.5 max-w-md text-[16px] leading-relaxed">A PDF or notes are enough to begin.</p>
                <div className="mt-6"><Link href="/dashboard/library" className={heroBtn}>Open My Library <ArrowRight className="h-4 w-4" /></Link></div>
              </>
            )}

            <dl className="mt-6 grid grid-cols-3 gap-2 sm:gap-2.5">
              {tiles.map((t) => (
                <div key={t.label} className="rounded-2xl bg-brand-deep px-3 py-3 sm:px-3.5">
                  <dt className="text-[13px] font-semibold leading-tight">{t.label}</dt>
                  <dd className="mt-1.5 font-ui text-[25px] font-bold leading-none tabular-nums">{t.value}</dd>
                  <dd className="mt-1.5 text-[13px] leading-tight">{t.note}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Understanding overview */}
        <section aria-label="Understanding overview" className="flex flex-col rounded-[24px] border border-line bg-card p-5 lg:col-span-2">
          <h3 className={cardTitle}>Understanding</h3>
          <div className="mt-4 flex flex-1 flex-col items-center gap-5 sm:flex-row sm:items-center lg:flex-col xl:flex-row">
            <StateRing counts={counts} total={cps.length} size={132}>
              <span className="font-ui text-[26px] font-bold leading-none tabular-nums text-ink">{assessed}<span className="text-ink-3">/{cps.length}</span></span>
              <span className="mt-1 text-[13px] text-ink-2">assessed</span>
            </StateRing>
            <ul className="w-full space-y-2.5">
              {ORDER.map((s) => (
                <li key={s} className="flex items-center justify-between gap-3 text-[15px]">
                  <span className="flex items-center gap-2.5 text-ink-2"><StateGlyph state={s} size={13} />{STATE_META[s].label}</span>
                  <span className="font-ui font-bold tabular-nums text-ink">{counts[s]}</span>
                </li>
              ))}
            </ul>
          </div>
          <Link href="/dashboard/progress" className={`${btnSecondary} mt-5 w-full`}>Open Progress <ArrowRight className="h-4 w-4" /></Link>
        </section>
      </div>

      {/* Subjects */}
      <section aria-label="Subject progress" className="space-y-3">
        <div className="flex items-center justify-between"><h3 className={cardTitle}>Subjects</h3><Link href="/dashboard/progress" className="font-ui text-sm font-semibold text-brand-text hover:underline">All progress</Link></div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {subjects.map((s) => {
            const sp = subjectProgress(data, s.id);
            const a = accentFor(ids, s.id);
            const count = materials.filter((m) => m.subjectId === s.id).length;
            return (
              <li key={s.id}>
                <Link href={`/dashboard/progress?subject=${s.id}`} className="rm-lift group flex h-full flex-col rounded-3xl border border-line bg-card p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] font-ui text-lg font-bold" style={{ background: a.soft, color: a.text }}>{s.name.slice(0, 1)}</span>
                      <div className="min-w-0"><p className="truncate font-ui text-base font-bold text-ink">{s.name}</p><p className="text-[13px] text-ink-3">{count} material{count === 1 ? "" : "s"}</p></div>
                    </div>
                    <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-ink-3 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-brand" />
                  </div>
                  {sp.total > 0 ? (
                    <>
                      <p className="mt-4 font-ui text-[24px] font-bold leading-none tabular-nums text-ink">{sp.assessed}<span className="text-ink-3">/{sp.total}</span> <span className="text-[15px] font-semibold text-ink-2">concepts assessed</span></p>
                      <div className="mt-3"><SegBar counts={sp.counts} total={sp.total} name={`${s.name} overview`} /></div>
                    </>
                  ) : (
                    <p className="mt-5 text-[15px] text-ink-2">No concept map yet.</p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Needs attention: compact, structured */}
        <section className={`${panel} p-5 lg:col-span-2`} aria-label="Knowledge gaps">
          <div className="flex items-center justify-between"><h3 className={cardTitle}>Needs attention</h3><Link href="/dashboard/gaps" className="font-ui text-sm font-semibold text-brand-text hover:underline">All gaps</Link></div>
          {gaps.length === 0 ? (
            <p className="mt-3 text-base text-ink-2">No suspected gaps.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {gaps.slice(0, 3).map((g) => (
                <li key={g.concept.id}>
                  <Link href={`/dashboard/map?concept=${g.concept.id}`} className="group flex items-center gap-3 rounded-lg border border-line px-3.5 py-3 transition-colors hover:border-bad-line hover:bg-bad-soft">
                    <StateGlyph state="suspected-gap" size={14} />
                    <div className="min-w-0 flex-1"><p className="truncate font-ui text-[15px] font-semibold text-ink">{g.concept.name}</p><p className="truncate text-[13px] text-ink-2">{subjectName(g.concept.subjectId)}, {g.correct} of {g.questions} correct</p></div>
                    <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent activity timeline */}
        <section className="rounded-[24px] border border-line bg-card p-5 lg:col-span-3" aria-label="Recent activity">
          <div className="flex items-center justify-between"><h3 className={cardTitle}>Recent activity</h3><Link href="/dashboard/history" className="font-ui text-sm font-semibold text-brand-text hover:underline">History</Link></div>
          {recent.length === 0 ? (
            <p className="mt-3 text-base text-ink-2">Nothing yet.</p>
          ) : (
            <ol className="relative mt-4 space-y-4 before:absolute before:bottom-3 before:left-[17px] before:top-3 before:w-px before:bg-line-strong">
              {recent.map((a) => {
                const Icon = ICON[a.type];
                return (
                  <li key={a.id} className="relative flex items-start gap-3.5">
                    <span aria-hidden className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line-strong bg-card text-brand"><Icon className="h-4 w-4" /></span>
                    <div className="min-w-0 pt-0.5"><p className="truncate font-ui text-[15px] font-semibold text-ink">{a.title}</p><p className="truncate text-[13px] text-ink-2">{ACTIVITY_LABEL[a.type]}, {subjectName(a.subjectId)}, {a.conceptIds.map(conceptName).join(", ")}</p></div>
                  </li>
                );
              })}
            </ol>
          )}
          {isDemo && <p className="mt-4 text-[13px] text-ink-3">Demo activity. No real dates yet.</p>}
        </section>
      </div>
    </div>
  );
}
