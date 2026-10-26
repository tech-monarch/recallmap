"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Dumbbell } from "lucide-react";
import type { Concept, Evidence } from "@/lib/recallmap/types";
import { dependentsOf, evidenceOf, prerequisitesOf, stateOf, suggestNext } from "@/lib/recallmap/knowledge";
import { STATE_META } from "@/lib/recallmap/state";
import { StateChip } from "@/components/recallmap/shared";
import { btnPrimary, btnSecondary, eyebrow } from "@/components/recallmap/styles";

export function EvidenceList({ evidence }: { evidence: Evidence[] }) {
  if (evidence.length === 0) return <p className="text-[15px] text-ink-2">No evidence yet.</p>;
  return (
    <ul className="space-y-2">
      {evidence.map((e) => {
        const inferred = e.kind === "inferred-misconception";
        return (
          <li key={e.id} className={`rounded-xl border p-3 text-[15px] ${inferred ? "border-dashed border-line-strong bg-canvas" : "border-line bg-card"}`}>
            <p className="font-ui text-[12.5px] font-bold uppercase tracking-wide text-ink-3">
              {e.kind === "observed-incorrect" ? "Observed: incorrect answer" : e.kind === "observed-correct" ? "Observed: correct answer" : `Inferred, not confirmed · ${e.confidence ?? "low"} confidence`}
            </p>
            <p className="mt-1 text-ink">{e.summary}</p>
          </li>
        );
      })}
    </ul>
  );
}

/** `materialId` is the subject's material to open for study/practice (null when none exists yet). */
export default function ConceptDetails({ concept, materialId, onSelect }: { concept: Concept; materialId: string | null; onSelect?: (id: string) => void }) {
  const st = stateOf(concept.id);
  const prereqs = prerequisitesOf(concept.id);
  const next = dependentsOf(concept.id);
  const base = materialId ? `/dashboard/sessions?material=${materialId}&concept=${concept.id}` : null;
  return (
    <aside aria-label={`Details for ${concept.name}`} className="rm-enter space-y-5 rounded-[24px] border border-line bg-card p-5">
      <div>
        <p className={eyebrow}>{concept.topic}</p>
        <h3 className="mt-1 font-ui text-[20px] font-bold tracking-[-0.02em] text-ink">{concept.name}</h3>
        <p className="mt-1.5 font-reading text-[16px] leading-[1.6] text-ink-2">{concept.explanation}</p>
      </div>
      <div><StateChip state={st} /><p className="mt-2 text-[14px] text-ink-2">{STATE_META[st].description}</p></div>

      <div>
        <h4 className="mb-2 font-ui text-sm font-bold text-ink">Prerequisites</h4>
        {prereqs.length === 0 ? <p className="text-[15px] text-ink-2">None. This is a starting point.</p> : (
          <ul className="space-y-2">{prereqs.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 text-[15px]">
              {onSelect ? <button onClick={() => onSelect(p.id)} className="text-left font-semibold text-brand-text underline underline-offset-2">{p.name}</button> : <span>{p.name}</span>}
              <StateChip state={stateOf(p.id)} />
            </li>))}</ul>
        )}
        {next.length > 0 && <p className="mt-2.5 text-[14px] text-ink-2">Builds toward: {next.map((n) => n.name).join(", ")}</p>}
      </div>

      <div><h4 className="mb-2 font-ui text-sm font-bold text-ink">Evidence</h4><EvidenceList evidence={evidenceOf(concept.id)} /></div>

      <div className="rounded-2xl bg-brand-soft p-4"><p className="font-ui text-[12.5px] font-bold uppercase tracking-[0.1em] text-brand-text">Suggested next</p><p className="mt-1 text-base text-ink">{suggestNext(concept.id)}</p></div>

      {base ? (
        <div className="flex flex-wrap gap-2">
          <Link href={base} className={btnPrimary}><BookOpen className="h-4 w-4" />Study this concept</Link>
          <Link href={`${base}#practice`} className={btnSecondary}><Dumbbell className="h-4 w-4" />Practice<ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>
      ) : <p className="text-[14px] text-ink-2">Add material to this subject in My Library to study this concept.</p>}
    </aside>
  );
}
