"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ClipboardCheck, Dumbbell, GraduationCap, History, RefreshCw, Repeat } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AccuracyBar, DemoBadge, Drawer, EmptyState, PageHeader } from "@/components/recallmap/shared";
import { btnPrimary, btnSecondary, cardTitle, select } from "@/components/recallmap/styles";
import { accentFor, type Accent } from "@/lib/recallmap/accent";
import { useLibrary } from "@/lib/recallmap/library-store";
import { DEMO_LEARNER_DATA, EMPTY_LEARNER_DATA } from "@/lib/recallmap/demo-history";
import { ACTIVITY_LABEL, NO_FILTERS, allActivities, attemptsForActivity, filterHistory, priorAttempt, type HistoryFilters } from "@/lib/recallmap/history";
import type { ActivityType, LearnerData, LearningActivity } from "@/lib/recallmap/types";

const ICON: Record<ActivityType, LucideIcon> = { "study-session": GraduationCap, assessment: ClipboardCheck, "follow-up-assessment": RefreshCw, "retention-check": Repeat, practice: Dumbbell };
const INTERVENTION: Record<string, string> = { "step-by-step": "Step-by-step explanation", example: "Worked example", analogy: "Analogy", simpler: "Simpler explanation", "prerequisite-review": "Prerequisite review" };

function Card({ a, data, subjectName, accent, selected, onOpen }: { a: LearningActivity; data: LearnerData; subjectName: string; accent: Accent; selected: boolean; onOpen: () => void }) {
  const Icon = ICON[a.type];
  const done = a.status === "completed";
  const attempts = attemptsForActivity(data, a.id);
  const total = attempts.reduce((n, t) => n + t.total, 0);
  const correct = attempts.reduce((n, t) => n + t.correct, 0);
  const outcome = !done ? "Suggested" : total > 0 ? `${correct} of ${total} correct` : "No score";
  return (
    <li>
      <button type="button" onClick={onOpen} aria-haspopup="dialog" aria-expanded={selected}
        className={`rm-lift group flex h-full w-full cursor-pointer flex-col gap-3 p-4 text-left ${selected ? "border-2 border-brand bg-brand-soft" : done ? "border border-line bg-card" : "border border-dashed border-line-strong bg-card"} ${done ? "rounded-2xl" : "rounded-[14px]"}`}>
        <span className="flex items-center justify-between gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-[14px]" style={{ background: selected ? "var(--card)" : accent.soft, color: accent.text }}><Icon className="h-[18px] w-[18px]" aria-hidden /></span>
          <span className={`rounded-full border px-2.5 py-0.5 font-ui text-xs font-semibold ${done ? "border-ok-line bg-ok-soft text-ok-ink" : "border-dashed border-line-strong bg-canvas text-ink-2"}`}>{done ? "Completed" : "Recommended, not done"}</span>
        </span>
        <span className="block font-ui text-[15px] font-semibold leading-snug text-ink">{a.title}</span>
        <span className="mt-auto flex items-center justify-between gap-2 text-[13px] text-ink-2">
          <span className="truncate">{subjectName}, {ACTIVITY_LABEL[a.type]}</span>
          <span className="shrink-0 font-ui font-semibold text-ink">{outcome}</span>
        </span>
        <span className="text-xs text-ink-3">{done && a.sequence ? `Demo step ${a.sequence}` : "Not scheduled"}</span>
      </button>
    </li>
  );
}

function Details({ a, data, nameOf, matId, subjectName, onClose }: { a: LearningActivity; data: LearnerData; nameOf: (id: string) => string; matId?: string; subjectName: string; onClose: () => void }) {
  const done = a.status === "completed";
  const attempts = attemptsForActivity(data, a.id);
  const followed = a.followsActivityId ? data.activities.find((x) => x.id === a.followsActivityId) : undefined;
  return (
    <Drawer title={a.title} subtitle={`${ACTIVITY_LABEL[a.type]}, ${subjectName}`} onClose={onClose}>
      <p className="text-base leading-relaxed">{a.summary}</p>
      {a.reason && <p className="rounded-xl bg-canvas p-3.5 text-ink-2"><span className="font-semibold text-ink">Why suggested:</span> {a.reason} This has not happened.</p>}
      <p className="text-ink-2"><span className="font-semibold text-ink">Concepts:</span>{" "}
        {a.conceptIds.map((id, i) => <span key={id}>{i > 0 && ", "}<Link href={`/dashboard/map?concept=${id}`} className="font-semibold text-brand-text underline-offset-2 hover:underline">{nameOf(id)}</Link></span>)}</p>
      {a.intervention && <p className="text-ink-2"><span className="font-semibold text-ink">Explanation tried:</span> {INTERVENTION[a.intervention.kind]}. {a.intervention.note}</p>}
      {done && attempts.length > 0 && (
        <div>
          <h4 className="mb-2 font-bold">Scored results</h4>
          <ul className="space-y-3">
            {attempts.map((t) => { const p = priorAttempt(data, t); return (
              <li key={t.id} className="text-ink-2"><span>{nameOf(t.conceptId)}: {t.correct} of {t.total} correct{p ? ` (previous attempt: ${p.correct} of ${p.total})` : ""}</span><div className="mt-1.5"><AccuracyBar correct={t.correct} total={t.total} /></div></li>
            ); })}
          </ul>
          {followed && <p className="mt-3 text-sm text-ink-3">This re-checked what followed “{followed.title}”. Change may have other causes, and small counts are tentative.</p>}
        </div>
      )}
      {done && attempts.length === 0 && <p className="text-ink-3">No scored result was recorded.</p>}
      {matId && (a.status === "recommended" || a.type === "study-session") && (
        <Link href={`/dashboard/sessions?material=${matId}&concept=${a.conceptIds[0]}${a.status === "recommended" ? "#practice" : ""}`} className={btnPrimary}>{a.status === "recommended" ? "Start this check" : "Study again"}</Link>
      )}
    </Drawer>
  );
}

export default function HistoryView() {
  const { subjects, materials, isDemo } = useLibrary();
  const data = isDemo ? DEMO_LEARNER_DATA : EMPTY_LEARNER_DATA;
  const [filters, setFilters] = useState<HistoryFilters>(NO_FILTERS);
  const [open, setOpen] = useState<string | null>(null);
  const uid = useId();

  const everything = allActivities(data);
  const shown = filterHistory(everything, filters);
  const recommended = shown.filter((a) => a.status === "recommended");
  const completed = shown.filter((a) => a.status === "completed");
  const filtered = filters.subjectId !== "all" || filters.type !== "all" || filters.status !== "all";
  const set = (patch: Partial<HistoryFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const subjectName = (id: string) => subjects.find((s) => s.id === id)?.name ?? id;
  const nameOf = (id: string) => data.concepts.find((c) => c.id === id)?.name ?? id;
  const header = <PageHeader title="Learning History" description="What you did, and what is only suggested." actions={isDemo ? <DemoBadge /> : undefined} />;

  if (everything.length === 0) {
    return <div>{header}<EmptyState icon={History} title="No learning history yet" body="Sessions, assessments and retention checks appear here once you complete them." action={<Link href="/dashboard/sessions" className={btnPrimary}>Open a study session</Link>} /></div>;
  }

  const idsAll = subjects.map((x) => x.id);
  const matOf = (sid: string) => materials.find((m) => m.subjectId === sid)?.id;
  const openItem = everything.find((x) => x.id === open) ?? null;
  const field = (label: string, node: React.ReactNode) => <label className="flex flex-col gap-1.5 font-ui text-[13px] font-semibold text-ink-2">{label}{node}</label>;
  return (
    <div>
      {header}
      <div className="mb-3 flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-card p-4" role="group" aria-label="Filter history">
        {field("Subject", <select className={select} value={filters.subjectId} onChange={(e) => set({ subjectId: e.target.value })}><option value="all">All subjects</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>)}
        {field("Activity type", <select className={select} value={filters.type} onChange={(e) => set({ type: e.target.value as HistoryFilters["type"] })}><option value="all">All types</option>{(Object.keys(ACTIVITY_LABEL) as ActivityType[]).map((t) => <option key={t} value={t}>{ACTIVITY_LABEL[t]}</option>)}</select>)}
        {field("Status", <select className={select} value={filters.status} onChange={(e) => set({ status: e.target.value as HistoryFilters["status"] })}><option value="all">Completed and recommended</option><option value="completed">Completed only</option><option value="recommended">Recommended only</option></select>)}
        {filtered && <button type="button" onClick={() => setFilters(NO_FILTERS)} className={btnSecondary}>Clear filters</button>}
      </div>
      <p className="mb-6 text-[15px] text-ink-2" role="status" aria-live="polite">Showing {shown.length} of {everything.length}.{isDemo && " Demo entries have no real dates; steps show order only."}</p>

      {shown.length === 0 ? (
        <EmptyState icon={History} title="Nothing matches these filters" body="Try a different subject, type or status." action={<button type="button" onClick={() => setFilters(NO_FILTERS)} className={btnPrimary}>Clear filters</button>} />
      ) : (
        <div className="space-y-9">
          {[{ id: "rec", title: "Recommended next", list: recommended }, { id: "done", title: "Completed activity", list: completed }].map((g) => g.list.length > 0 && (
            <section key={g.id} aria-labelledby={`${uid}-${g.id}`}>
              <h3 id={`${uid}-${g.id}`} className={`${cardTitle} mb-3`}>{g.title}</h3>
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{g.list.map((a) => <Card key={a.id} a={a} data={data} subjectName={subjectName(a.subjectId)} accent={accentFor(idsAll, a.subjectId)} selected={open === a.id} onOpen={() => setOpen(a.id)} />)}</ul>
            </section>
          ))}
        </div>
      )}
      {openItem && <Details a={openItem} data={data} nameOf={nameOf} subjectName={subjectName(openItem.subjectId)} matId={matOf(openItem.subjectId)} onClose={() => setOpen(null)} />}
    </div>
  );
}
