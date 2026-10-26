"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, TriangleAlert } from "lucide-react";
import { DemoBadge, Drawer, EmptyState, PageHeader, StateChip, StateGlyph } from "@/components/recallmap/shared";
import { EvidenceList } from "@/components/recallmap/ConceptDetails";
import { btnPrimary, btnSecondary } from "@/components/recallmap/styles";
import { useLibrary } from "@/lib/recallmap/library-store";
import { DEMO_CONCEPTS } from "@/lib/recallmap/demo-data";
import { stateOf, suspectedGaps } from "@/lib/recallmap/knowledge";

export default function GapsView() {
  const { subjects, materials, isDemo } = useLibrary();
  const [filter, setFilter] = useState<string>("all");
  const [open, setOpen] = useState<string | null>(null);
  const gaps = isDemo ? suspectedGaps() : [];
  const shown = gaps.filter((g) => filter === "all" || g.concept.subjectId === filter);
  const unassessed = isDemo ? DEMO_CONCEPTS.filter((c) => stateOf(c.id) === "not-assessed").length : 0;
  const subjectName = (id: string) => subjects.find((s) => s.id === id)?.name;
  const header = <PageHeader title="Knowledge Gaps" description="A gap stays a hypothesis until reassessment confirms it." actions={isDemo ? <DemoBadge /> : undefined} />;

  if (gaps.length === 0) {
    return <div>{header}<EmptyState icon={TriangleAlert} title="No knowledge gaps identified" body="Gaps appear only with assessment evidence. Unassessed concepts are never counted as gaps." action={<Link href="/dashboard/sessions" className={btnPrimary}>Practice in a study session</Link>} /></div>;
  }
  const current = shown.find((g) => g.concept.id === open) ?? null;
  return (
    <div>
      {header}
      <div className="mb-6 inline-flex max-w-full flex-wrap gap-1 rounded-full border border-line bg-card p-1" role="tablist" aria-label="Filter by subject">
        {[{ id: "all", name: "All subjects" }, ...subjects.filter((s) => gaps.some((g) => g.concept.subjectId === s.id))].map((s) => (
          <button key={s.id} role="tab" aria-selected={filter === s.id} onClick={() => setFilter(s.id)} className={`rounded-full px-5 py-2 font-ui text-sm font-semibold ${filter === s.id ? "bg-brand text-white" : "text-ink-2 hover:bg-canvas hover:text-ink"}`}>{s.name}</button>
        ))}
      </div>
      <ul key={filter} className="rm-enter grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map(({ concept, evidence, prerequisites }) => {
          const weak = prerequisites.filter((p) => ["partial", "suspected-gap"].includes(stateOf(p.id)));
          return (
            <li key={concept.id} className="rm-lift group relative flex flex-col gap-3 rounded-2xl border border-line bg-card p-5 focus-within:border-brand">
              <div className="flex items-start justify-between gap-2">
                <h3 className="flex items-center gap-2.5 font-ui text-lg font-bold tracking-[-0.01em] text-ink"><StateGlyph state="suspected-gap" size={15} /><button type="button" onClick={() => setOpen(concept.id)} aria-haspopup="dialog" className="cursor-pointer text-left after:absolute after:inset-0 after:rounded-2xl after:content-['']">{concept.name}</button></h3>
                <StateChip state="suspected-gap" />
              </div>
              <p className="text-[13px] font-semibold text-ink-3">{subjectName(concept.subjectId)}, {concept.topic}</p>
              <p className="font-reading text-[16px] leading-[1.55] text-ink-2">{evidence[0]?.summary}</p>
              {weak.length > 0 && <p className="mt-auto rounded-lg bg-amber-soft px-3 py-1.5 text-[13px] font-semibold text-amber-ink">Review first: {weak.map((w) => w.name).join(", ")}</p>}
            </li>
          );
        })}
      </ul>
      <p className="mt-6 text-[14px] text-ink-3">{unassessed} concept{unassessed === 1 ? " is" : "s are"} not yet assessed and not counted as gaps. Results are illustrative.</p>

      {current && (() => {
        const { concept, evidence, prerequisites, blocks, recommendation } = current;
        const observed = evidence.filter((e) => e.kind !== "inferred-misconception");
        const inferred = evidence.filter((e) => e.kind === "inferred-misconception");
        const matId = materials.find((m) => m.subjectId === concept.subjectId)?.id;
        const weak = prerequisites.filter((p) => ["partial", "suspected-gap"].includes(stateOf(p.id)));
        return (
          <Drawer title={concept.name} subtitle={`${subjectName(concept.subjectId)}, ${concept.topic}`} onClose={() => setOpen(null)}>
            <div><h4 className="mb-2 font-bold">What was observed</h4><EvidenceList evidence={observed} /></div>
            <div><h4 className="mb-2 font-bold">What is inferred (not confirmed)</h4>
              {inferred.length ? <EvidenceList evidence={inferred} /> : <p className="text-ink-2">Nothing inferred. A wrong answer alone does not explain why.</p>}
            </div>
            <div><h4 className="mb-2 font-bold">Prerequisites</h4>
              {prerequisites.length === 0 ? <p className="text-ink-2">None.</p> : <ul className="space-y-2">{prerequisites.map((p) => <li key={p.id} className="flex items-center justify-between"><span>{p.name}</span><StateChip state={stateOf(p.id)} /></li>)}</ul>}
              {weak.length > 0 && <p className="mt-2 text-sm font-semibold text-amber-ink">Unresolved prerequisite: {weak.map((w) => w.name).join(", ")}.</p>}
              {blocks.length > 0 && <p className="mt-2 text-sm text-ink-2">Affects: {blocks.map((b) => b.name).join(", ")}.</p>}
            </div>
            <div className="rounded-2xl bg-brand-soft p-4">
              <p className="font-ui text-[12.5px] font-bold uppercase tracking-[0.1em] text-brand-text">Recommended</p>
              <p className="mt-1 text-base">{recommendation}</p>
              {matId ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/dashboard/sessions?material=${matId}&concept=${concept.id}`} className={btnPrimary}>Study</Link>
                  <Link href={`/dashboard/sessions?material=${matId}&concept=${concept.id}#practice`} className={btnSecondary}>Reassess</Link>
                  <Link href={`/dashboard/map?concept=${concept.id}`} className={btnSecondary}>On the map <ArrowRight className="h-3.5 w-3.5" /></Link>
                </div>
              ) : <p className="mt-2 text-sm text-ink-2">Add material to this subject to study it.</p>}
            </div>
          </Drawer>
        );
      })()}
    </div>
  );
}
