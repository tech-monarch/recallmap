"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, FileText, MessagesSquare, Type } from "lucide-react";
import { DemoBadge, EmptyState, PageHeader } from "@/components/recallmap/shared";
import { btnPrimary, btnSecondary, cardTitle } from "@/components/recallmap/styles";
import { useLibrary } from "@/lib/recallmap/library-store";
import { accentFor } from "@/lib/recallmap/accent";
import { DEMO_SESSIONS } from "@/lib/recallmap/demo-data";
import StudyWorkspace from "@/components/recallmap/StudyWorkspace";

export default function SessionsView() {
  const { materials, subjects, isDemo } = useLibrary();
  const params = useSearchParams();
  const materialId = params.get("material");
  const conceptParam = params.get("concept");

  if (materialId) {
    const material = materials.find((m) => m.id === materialId);
    if (!material) {
      return <EmptyState icon={MessagesSquare} title="Material not found" body="This material is not in your library." action={<Link href="/dashboard/library" className={btnPrimary}>Back to My Library</Link>} />;
    }
    const subjectName = subjects.find((s) => s.id === material.subjectId)?.name ?? "";
    return <StudyWorkspace key={`${material.id}:${conceptParam ?? ""}`} material={material} subjectName={subjectName} initialConcept={conceptParam} />;
  }

  const ids = subjects.map((s) => s.id);
  return (
    <div>
      <PageHeader title="Study Sessions" description="Pick a material and study with the tutor." actions={isDemo ? <DemoBadge /> : undefined} />
      {materials.length === 0 ? (
        <EmptyState icon={MessagesSquare} title="No study sessions yet" body="Add material in My Library to begin." action={<Link href="/dashboard/library" className={btnPrimary}>Go to My Library</Link>} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          <section aria-label="Start a session" className="lg:col-span-3">
            <h3 className={`${cardTitle} mb-3`}>Start a session</h3>
            <ul className="space-y-3">
              {materials.map((m) => {
                const a = accentFor(ids, m.subjectId);
                return (
                  <li key={m.id} className="rm-lift flex items-center gap-4 rounded-2xl border border-line bg-card p-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px]" style={{ background: a.soft, color: a.text }}>{m.kind === "pdf" ? <FileText className="h-5 w-5" /> : <Type className="h-5 w-5" />}</span>
                    <div className="min-w-0 flex-1"><p className="truncate font-ui text-[15px] font-semibold text-ink">{m.title}</p><p className="text-[13px] text-ink-2">{subjects.find((s) => s.id === m.subjectId)?.name}</p></div>
                    <Link href={`/dashboard/sessions?material=${m.id}`} className={`${btnSecondary} shrink-0`}>Study <ArrowRight className="h-4 w-4" /></Link>
                  </li>
                );
              })}
            </ul>
          </section>
          <section aria-label="Previous sessions" className="rounded-xl border border-line bg-card p-5 lg:col-span-2 lg:self-start">
            <h3 className={cardTitle}>Previous sessions</h3>
            {isDemo ? (
              <ul className="mt-3 divide-y divide-line">{DEMO_SESSIONS.map((s) => <li key={s.id} className="py-3"><p className="font-ui text-[15px] font-semibold text-ink">{s.title}</p><p className="text-[13px] text-ink-2">{s.kind === "assessment" ? "Assessment" : "Study session"}, {s.when}</p></li>)}</ul>
            ) : (
              <p className="mt-3 text-base text-ink-2">None yet.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
