"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Network } from "lucide-react";
import { DemoBadge, EmptyState, PageHeader, StateLegend } from "@/components/recallmap/shared";
import { btnPrimary } from "@/components/recallmap/styles";
import KnowledgeGraph from "@/components/recallmap/KnowledgeGraph";
import ConceptDetails from "@/components/recallmap/ConceptDetails";
import { useLibrary } from "@/lib/recallmap/library-store";
import { conceptById, conceptsFor } from "@/lib/recallmap/knowledge";

export default function MapView() {
  const { subjects, materials, isDemo } = useLibrary();
  const search = useSearchParams();
  const param = search.get("concept");
  const subjectParam = search.get("subject");
  const fromParam = param ? conceptById(param) : null;
  const [subjectId, setSubjectId] = useState<string | null>(fromParam?.subjectId ?? subjectParam);
  const [selected, setSelected] = useState<string | null>(fromParam?.id ?? null);

  if (subjects.length === 0) {
    return <div><PageHeader title="Knowledge Map" description="One map per subject." /><EmptyState icon={Network} title="No knowledge maps yet" body="Create a subject and add material in My Library first." action={<Link href="/dashboard/library" className={btnPrimary}>Go to My Library</Link>} /></div>;
  }
  const subject = subjects.find((s) => s.id === subjectId) ?? subjects[0];
  const concepts = conceptsFor(subject.id);
  const concept = concepts.find((c) => c.id === selected) ?? null;
  const materialId = materials.find((m) => m.subjectId === subject.id)?.id ?? null;

  return (
    <div>
      <PageHeader title="Knowledge Map" description="Arrows run from prerequisite to concept." actions={isDemo ? <DemoBadge /> : undefined} />
      <div className="mb-5 inline-flex max-w-full flex-wrap gap-1 rounded-full border border-line bg-card p-1" role="tablist" aria-label="Subjects">
        {subjects.map((s) => (
          <button key={s.id} role="tab" aria-selected={s.id === subject.id} onClick={() => { setSubjectId(s.id); setSelected(null); }} className={`rounded-full px-5 py-2 font-ui text-sm font-semibold ${s.id === subject.id ? "bg-brand text-white" : "text-ink-2 hover:bg-canvas hover:text-ink"}`}>{s.name}</button>
        ))}
      </div>
      {concepts.length === 0 ? (
        <EmptyState icon={Network} title={`No map for ${subject.name} yet`} body="Maps come from processed material. Processing is not connected yet, so only demo subjects have maps." action={<Link href="/dashboard/library" className={btnPrimary}>Open My Library</Link>} />
      ) : (
        <>
          <div className="mb-3"><StateLegend /></div>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <KnowledgeGraph concepts={concepts} selectedId={selected} onSelect={setSelected} />
            {concept ? <ConceptDetails key={concept.id} concept={concept} materialId={materialId} onSelect={setSelected} /> : (
              <div className="flex items-center justify-center rounded-[24px] border border-dashed border-line-strong bg-card p-6 text-center text-base text-ink-2 lg:min-h-48">Select a concept to see its details and prerequisites.</div>
            )}
          </div>
          <p className="mt-3 text-[13px] text-ink-3">Results are illustrative. A diamond marks a suspected gap, which is an inference.</p>
        </>
      )}
    </div>
  );
}
