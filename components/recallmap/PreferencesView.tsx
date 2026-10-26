"use client";

import { useId, useState } from "react";
import { Info } from "lucide-react";
import { DemoBadge, PageHeader } from "@/components/recallmap/shared";
import { btnPrimary, btnSecondary, field } from "@/components/recallmap/styles";
import { usePreferences } from "@/lib/recallmap/preferences-store";
import { CONCEPT_TUTOR } from "@/lib/recallmap/demo-tutor";
import {
  DEFAULT_PREFERENCES, DEPTH_OPTIONS, DIFFICULTY_OPTIONS, MAX_GOALS_LENGTH, PACE_OPTIONS, STYLE_OPTIONS,
  previewParts, samePreferences, toggleStyle,
} from "@/lib/recallmap/preferences";
import type { LearnerPreferences } from "@/lib/recallmap/types";

const card = "rounded-[24px] border border-line bg-card p-5";
const option = "flex cursor-pointer flex-col rounded-2xl border p-4 text-base transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand";

function Choice<T extends string>({ legend, name, options, value, onChange }: { legend: string; name: string; options: { id: T; label: string; hint: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <fieldset className={card}>
      <legend className="px-1 font-ui text-base font-bold text-ink">{legend}</legend>
      <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
        {options.map((o) => (
          <label key={o.id} className={`${option} ${value === o.id ? "border-brand bg-brand-soft" : "border-line-strong bg-card hover:border-brand-line hover:bg-canvas"}`}>
            <span className="flex items-center gap-2.5 font-ui font-semibold text-ink"><input type="radio" name={name} value={o.id} checked={value === o.id} onChange={() => onChange(o.id)} className="h-4 w-4 accent-brand" />{o.label}</span>
            <span className="mt-1.5 text-[14px] text-ink-2">{o.hint}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Form({ saved }: { saved: LearnerPreferences }) {
  const { save, reset, storageOk } = usePreferences();
  const [draft, setDraft] = useState<LearnerPreferences>(saved);
  const [msg, setMsg] = useState("");
  const uid = useId();
  const dirty = !samePreferences(draft, saved);
  const patch = (p: Partial<LearnerPreferences>) => { setDraft((d) => ({ ...d, ...p })); setMsg(""); };
  const unsupportedPicked = draft.explanationStyle.includes("visual");
  const parts = previewParts(draft, CONCEPT_TUTOR.variables);

  return (
    <div className="space-y-4">
      <div role="note" className="flex gap-2.5 rounded-xl border border-line bg-card px-4 py-3 text-[15px] text-ink-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
        <p><span className="font-semibold text-ink">Stored in this browser only.</span> The demo tutor does not adapt to these choices yet.</p>
      </div>

      <fieldset className={card}>
        <legend className="px-1 font-ui text-base font-bold text-ink">Explanation style</legend>
        <p className="text-[14px] text-ink-2">Choose any that help.</p>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {STYLE_OPTIONS.map((o) => {
            const on = draft.explanationStyle.includes(o.id);
            return (
              <label key={o.id} className={`${option} ${on ? "border-brand bg-brand-soft" : "border-line-strong bg-card hover:border-brand-line hover:bg-canvas"}`}>
                <span className="flex flex-wrap items-center gap-2.5 font-ui font-semibold text-ink">
                  <input type="checkbox" checked={on} onChange={() => patch({ explanationStyle: toggleStyle(draft.explanationStyle, o.id) })} className="h-4 w-4 accent-brand" />
                  {o.label}{!o.supported && <span className="rounded-full border border-dashed border-line-strong px-2.5 py-0.5 text-[12.5px] font-semibold text-ink-2">Not available yet</span>}
                </span>
                <span className="mt-1.5 text-[14px] text-ink-2">{o.hint}</span>
              </label>
            );
          })}
        </div>
        {unsupportedPicked && <p className="mt-3 text-[14px] font-semibold text-amber-ink">Kept in your preferences, but the tutor cannot produce visual explanations yet.</p>}
      </fieldset>

      <Choice legend="Explanation depth" name={`${uid}-depth`} options={DEPTH_OPTIONS} value={draft.explanationDepth} onChange={(v) => patch({ explanationDepth: v })} />
      <Choice legend="Learning pace" name={`${uid}-pace`} options={PACE_OPTIONS} value={draft.pace} onChange={(v) => patch({ pace: v })} />
      <Choice legend="Preferred difficulty" name={`${uid}-difficulty`} options={DIFFICULTY_OPTIONS} value={draft.difficulty} onChange={(v) => patch({ difficulty: v })} />

      <div className={card}>
        <label htmlFor={`${uid}-goals`} className="font-ui text-base font-bold text-ink">Learning goals (optional)</label>
        <p className="text-[14px] text-ink-2">e.g. “Pass my Python exam”.</p>
        <textarea id={`${uid}-goals`} value={draft.goals} maxLength={MAX_GOALS_LENGTH} rows={3} onChange={(e) => patch({ goals: e.target.value })} className={`${field} mt-3`} />
        <p className="mt-1 text-right text-[13px] text-ink-3">{draft.goals.length}/{MAX_GOALS_LENGTH}</p>
      </div>

      <section aria-labelledby={`${uid}-preview`} className={card}>
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 id={`${uid}-preview`} className="font-ui text-base font-bold text-ink">Sample of your choices</h3><DemoBadge label="Canned sample text, not AI-generated" /></div>
        <p className="mt-1 text-[14px] text-ink-2">Explaining “Variables” with your current (unsaved) selections. {draft.explanationStyle.length === 0 ? "No style chosen, so only the default overview is shown." : ""}</p>
        <dl className="mt-4 space-y-2">{parts.map((p) => <div key={p.label} className="rounded-xl bg-canvas px-4 py-3"><dt className="font-ui text-[12.5px] font-bold uppercase tracking-wide text-ink-3">{p.label}</dt><dd className="mt-0.5 font-reading text-[16px] leading-[1.6] text-ink">{p.text}</dd></div>)}</dl>
      </section>

      <section aria-labelledby={`${uid}-use`} className={card}>
        <h3 id={`${uid}-use`} className="font-ui text-base font-bold text-ink">Where these are used</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] text-ink-2">
          <li><span className="font-semibold text-ink">Explanation style:</span> highlights your quick actions in Study Sessions.</li>
          <li><span className="font-semibold text-ink">Depth, pace, difficulty, goals:</span> saved only for now.</li>
        </ul>
      </section>

      <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-10 md:bottom-3 flex flex-wrap items-center gap-2.5 rounded-[24px] border border-line bg-card p-3 shadow-[0_6px_16px_-10px_rgba(28,35,48,.3)]">
        <button type="button" disabled={!dirty} onClick={() => { save(draft); setMsg("Saved in this browser."); }} className={btnPrimary}>Save preferences</button>
        <button type="button" disabled={!dirty} onClick={() => { setDraft(saved); setMsg("Changes discarded."); }} className={btnSecondary}>Discard changes</button>
        <button type="button" disabled={samePreferences(saved, DEFAULT_PREFERENCES) && !dirty} onClick={() => { reset(); setDraft(DEFAULT_PREFERENCES); setMsg("Reset to defaults."); }} className={btnSecondary}>Reset to defaults</button>
        <p role="status" aria-live="polite" className="text-[14px] text-ink-2">{!storageOk ? "This browser blocked storage, so your preferences cannot be kept after you leave this page." : msg || (dirty ? "You have unsaved changes." : "")}</p>
      </div>
    </div>
  );
}

export default function PreferencesView() {
  const { saved, loaded } = usePreferences();
  return (
    <div className="max-w-3xl">
      <PageHeader title="Preferences" description="How RecallMap explains things to you. All optional." />
      {/* Mount the form only after stored values load so the draft starts from them. */}
      {loaded ? <Form saved={saved} /> : <p className="text-base text-ink-2" role="status">Loading your preferences…</p>}
    </div>
  );
}
