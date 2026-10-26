"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, FileUp, Library, Network, Plus, Type } from "lucide-react";
import { DemoBadge, EmptyState, PageHeader } from "@/components/recallmap/shared";
import { btnPrimary, btnSecondary, cardTitle, field } from "@/components/recallmap/styles";
import { useLibrary } from "@/lib/recallmap/library-store";

const btn = btnPrimary;
const btnGhost = btnSecondary;

export default function LibraryPage() {
  const { subjects, materials, isDemo, addSubject, addMaterial, clearDemo, loadDemo } = useLibrary();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panel, setPanel] = useState<"none" | "subject" | "material">("none");
  const [subName, setSubName] = useState("");
  const [subDesc, setSubDesc] = useState("");
  const [mode, setMode] = useState<"pdf" | "text">("pdf");
  const [matTitle, setMatTitle] = useState("");
  const [matText, setMatText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  const selected = subjects.find((s) => s.id === selectedId) ?? subjects[0] ?? null;
  const subjectMaterials = selected ? materials.filter((m) => m.subjectId === selected.id) : [];

  function createSubject() {
    if (!subName.trim()) return setError("Give the subject a name.");
    if (subjects.some((s) => s.name.toLowerCase() === subName.trim().toLowerCase())) return setError("That subject already exists. Add material to it instead.");
    const id = addSubject(subName, subDesc);
    setSelectedId(id);
    setSubName(""); setSubDesc(""); setError(""); setPanel("none");
  }

  function saveMaterial() {
    if (!selected) return;
    if (mode === "pdf") {
      if (!file) return setError("Choose a PDF file.");
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return setError("That file is not a PDF.");
      addMaterial({ subjectId: selected.id, title: matTitle.trim() || file.name.replace(/\.pdf$/i, ""), kind: "pdf" });
    } else {
      if (!matTitle.trim()) return setError("Give the material a title.");
      if (matText.trim().length < 20) return setError("Paste a little more content.");
      addMaterial({ subjectId: selected.id, title: matTitle, kind: "text", content: matText });
    }
    setMatTitle(""); setMatText(""); setFile(null); setError(""); setPanel("none");
  }

  return (
    <div>
      <PageHeader
        title="My Library"
        description="Subjects and the materials you learn from."
        actions={
          <div className="flex items-center gap-2">
            {isDemo ? <DemoBadge label="Showing demonstration subjects" /> : null}
            <button className={btn} onClick={() => { setPanel("subject"); setError(""); }}><Plus className="h-4 w-4" />New subject</button>
          </div>
        }
      />

      {panel === "subject" && (
        <section className="rm-enter mb-6 rounded-[24px] border border-line bg-card p-6" aria-label="Create subject">
          <h3 className={cardTitle}>Create a subject</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input className={field} placeholder="e.g. Database Systems" value={subName} onChange={(e) => setSubName(e.target.value)} aria-label="Subject name" />
            <input className={field} placeholder="Short description (optional)" value={subDesc} onChange={(e) => setSubDesc(e.target.value)} aria-label="Subject description" />
          </div>
          {error && <p role="alert" className="mt-2 text-sm font-semibold text-bad-ink">{error}</p>}
          <div className="mt-3 flex gap-2"><button className={btn} onClick={createSubject}>Create subject</button><button className={btnGhost} onClick={() => { setPanel("none"); setError(""); }}>Cancel</button></div>
        </section>
      )}

      {subjects.length === 0 ? (
        <EmptyState
          icon={Library}
          title="Your library is empty"
          body="Create a subject, then add a PDF or notes. Each subject gets its own map."
          action={<div className="flex gap-2"><button className={btn} onClick={() => setPanel("subject")}><Plus className="h-4 w-4" />Create a subject</button><button className={btnGhost} onClick={loadDemo}>Load demonstration data</button></div>}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-[230px_minmax(0,1fr)]">
          <nav aria-label="Subjects" className="space-y-2.5">
            {subjects.map((s) => {
              const count = materials.filter((m) => m.subjectId === s.id).length;
              const active = selected?.id === s.id;
              return (
                <button key={s.id} onClick={() => { setSelectedId(s.id); setPanel("none"); }} aria-current={active} className={`w-full rounded-2xl border-2 px-4 py-3.5 text-left transition-all duration-200 ${active ? "border-brand bg-brand-soft" : "rm-lift border-line bg-card"}`}>
                  <p className={`font-ui text-[15px] font-bold ${active ? "text-brand-text" : "text-ink"}`}>{s.name}</p>
                  <p className="text-[13px] text-ink-2">{count} material{count === 1 ? "" : "s"}</p>
                </button>
              );
            })}
            {isDemo && <button className="w-full pt-2 text-left text-[14px] text-ink-2 underline underline-offset-2 hover:text-ink" onClick={clearDemo}>Remove demonstration data</button>}
          </nav>

          {selected && (
            <section aria-label={`${selected.name} materials`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-ui text-[20px] font-bold tracking-[-0.02em] text-ink">{selected.name}</h3>
                  {selected.description && <p className="text-base text-ink-2">{selected.description}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/dashboard/map?subject=${selected.id}`} className={btnGhost}><Network className="h-4 w-4" />Knowledge map</Link>
                  <button className={btn} onClick={() => { setPanel("material"); setError(""); }}><Plus className="h-4 w-4" />Add material</button>
                </div>
              </div>

              {panel === "material" && (
                <div className="rm-enter mt-4 rounded-[24px] border border-line bg-card p-6" aria-label="Add material">
                  <p className={cardTitle}>Add to {selected.name}</p>
                  <div className="mt-3 inline-flex rounded-full border border-line-strong p-1">
                    <button onClick={() => setMode("pdf")} className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 font-ui text-[13px] font-semibold ${mode === "pdf" ? "bg-brand text-white" : "text-ink-2 hover:text-ink"}`}><FileUp className="h-3.5 w-3.5" />Upload PDF</button>
                    <button onClick={() => setMode("text")} className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 font-ui text-[13px] font-semibold ${mode === "text" ? "bg-brand text-white" : "text-ink-2 hover:text-ink"}`}><Type className="h-3.5 w-3.5" />Paste text</button>
                  </div>
                  <div className="mt-3 space-y-3">
                    <input className={field} placeholder={mode === "pdf" ? "Title (optional, defaults to file name)" : "Title"} value={matTitle} onChange={(e) => setMatTitle(e.target.value)} aria-label="Material title" />
                    {mode === "pdf" ? (
                      <input type="file" accept="application/pdf,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} aria-label="PDF file" className="block w-full text-sm text-ink-2 file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-brand-soft file:px-4 file:py-2 file:font-ui file:text-sm file:font-semibold file:text-brand-text hover:file:bg-brand-line" />
                    ) : (
                      <textarea className={`${field} min-h-32`} placeholder="Paste notes or lessons here" value={matText} onChange={(e) => setMatText(e.target.value)} aria-label="Material text" />
                    )}
                  </div>
                  <p className="mt-2 text-[13px] text-ink-3">Demo only: files are not uploaded or read yet.</p>
                  {error && <p role="alert" className="mt-2 text-sm font-semibold text-bad-ink">{error}</p>}
                  <div className="mt-3 flex gap-2"><button className={btn} onClick={saveMaterial}>Add material</button><button className={btnGhost} onClick={() => { setPanel("none"); setError(""); }}>Cancel</button></div>
                </div>
              )}

              {subjectMaterials.length === 0 ? (
                <div className="mt-4"><EmptyState icon={FileText} title="No material in this subject yet" body="Add a PDF or notes to start." action={<button className={btn} onClick={() => setPanel("material")}><Plus className="h-4 w-4" />Add material</button>} /></div>
              ) : (
                <ul className="mt-5 grid gap-3">
                  {subjectMaterials.map((m) => (
                    <li key={m.id} className="rm-lift flex items-center gap-4 rounded-2xl border border-line bg-card px-4 py-3.5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-brand-soft text-brand">{m.kind === "pdf" ? <FileText className="h-5 w-5" /> : <Type className="h-5 w-5" />}</div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-ui text-[15px] font-semibold text-ink">{m.title}</p>
                        <p className="text-[13px] text-ink-2">{m.kind === "pdf" ? "PDF" : "Text"}, {m.status === "demo" ? "demonstration material" : "not processed yet"}</p>
                      </div>
                      <Link href={`/dashboard/sessions?material=${m.id}`} className={btnGhost}>Study</Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
