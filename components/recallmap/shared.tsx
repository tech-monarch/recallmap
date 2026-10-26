import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { X, type LucideIcon } from "lucide-react";
import { STATE_META } from "@/lib/recallmap/state";
import type { UnderstandingState } from "@/lib/recallmap/types";
import { accuracy } from "@/lib/recallmap/progress";
import { DEMO_LABEL } from "@/lib/recallmap/demo-data";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-ui text-[25px] font-bold leading-tight tracking-[-0.02em] text-ink">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-base leading-relaxed text-ink-2">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

/** Honest labelling for any content that is not real learner data. */
export function DemoBadge({ label = DEMO_LABEL }: { label?: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-dashed border-line-strong bg-card px-3 py-1 font-ui text-[12.5px] font-semibold text-ink-2">
      {label}
    </span>
  );
}

/** One silhouette per understanding state, so state is readable without colour. */
export function StateGlyph({ state, size = 12 }: { state: UnderstandingState; size?: number }) {
  const c = STATE_META[state].hex;
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden className="shrink-0">
      {state === "demonstrated" && <circle cx="6" cy="6" r="5" fill={c} />}
      {state === "partial" && <rect x="1" y="1" width="10" height="10" rx="3" fill={c} />}
      {state === "suspected-gap" && <rect x="2" y="2" width="8" height="8" rx="1.5" fill={c} transform="rotate(45 6 6)" />}
      {state === "not-assessed" && <circle cx="6" cy="6" r="4.2" fill="none" stroke={c} strokeWidth="1.6" strokeDasharray="2.2 1.8" />}
    </svg>
  );
}

export function StateChip({ state }: { state: UnderstandingState }) {
  const m = STATE_META[state];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-ui text-xs font-semibold ${m.chip}`}>
      <StateGlyph state={state} size={10} />
      {m.label}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-[28px] border border-dashed border-line-strong bg-card px-6 py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[18px] bg-brand-soft text-brand">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-ui text-lg font-bold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-md text-base text-ink-2">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/** Marks a section as scaffolded and names the milestone that fills it in. */
export function MilestoneNote({ milestone, children }: { milestone: number; children: ReactNode }) {
  return (
    <div className="mt-4 rounded-lg border border-line bg-canvas px-4 py-3 text-sm text-ink-2">
      <span className="font-semibold text-ink">Planned for milestone {milestone}.</span> {children}
    </div>
  );
}

export function StateLegend() {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Understanding states">
      {(Object.keys(STATE_META) as UnderstandingState[]).map((s) => (
        <li key={s} className="flex items-center gap-2 text-sm text-ink-2">
          <StateGlyph state={s} size={13} />
          {STATE_META[s].label}
        </li>
      ))}
    </ul>
  );
}

const ORDER: UnderstandingState[] = ["demonstrated", "partial", "suspected-gap", "not-assessed"];
/** Segmented bar of understanding states. Not-assessed is a dashed outline so missing data never reads as weakness. */
export function SegBar({ counts, total, name, height = "h-3" }: { counts: Record<UnderstandingState, number>; total: number; name: string; height?: string }) {
  const label = `${name}: ` + ORDER.map((s) => `${counts[s]} ${STATE_META[s].label.toLowerCase()}`).join(", ");
  return (
    <div role="img" aria-label={label} className={`flex ${height} w-full gap-1`}>
      {ORDER.map((s) => counts[s] > 0 && (
        <span key={s} style={{ width: `${(counts[s] / total) * 100}%` }} className={`rm-grow rounded-full ${s === "not-assessed" ? "border-2 border-dashed border-idle bg-card" : STATE_META[s].dot}`} />
      ))}
    </div>
  );
}

/** Ring chart of understanding states. Segments and the legend are optional filters (onPick). */
export function StateRing({ counts, total, active, onPick, size = 176, children }: { counts: Record<UnderstandingState, number>; total: number; active?: UnderstandingState | null; onPick?: (s: UnderstandingState) => void; size?: number; children?: ReactNode }) {
  const r = 38, C = 2 * Math.PI * r, gap = total > 1 ? 2.2 : 0;
  let offset = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden className="-rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--idle-soft)" strokeWidth="13" />
        {total > 0 && ORDER.map((s) => {
          if (!counts[s]) return null;
          const len = (counts[s] / total) * C;
          const dash = Math.max(len - gap, 0.5);
          const el = (
            <circle key={s} cx="50" cy="50" r={r} fill="none" stroke={STATE_META[s].hex} strokeWidth={active === s ? 16 : 13} strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-offset}
              opacity={active && active !== s ? 0.25 : 1} className={`rm-fade ${onPick ? "cursor-pointer" : ""}`} style={{ transition: "stroke-width .2s, opacity .2s" }} onClick={onPick ? () => onPick(s) : undefined} />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

/** Small accuracy bar for one scored attempt. Always shown with its question count. */
export function AccuracyBar({ correct, total, color = "var(--brand)" }: { correct: number; total: number; color?: string }) {
  const a = accuracy({ correct, total }) ?? 0;
  return (
    <span className="block h-2 w-full overflow-hidden rounded-full bg-idle-soft" aria-hidden>
      <span className="rm-grow block h-full rounded-full" style={{ width: `${Math.max(a * 100, a > 0 ? 4 : 0)}%`, background: color }} />
    </span>
  );
}

/**
 * Right-hand detail drawer (bottom sheet on small screens).
 * Esc, backdrop click and the close button dismiss it. Focus moves in on open and returns to the trigger on close.
 */
export function Drawer({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode }) {
  const [closing, setClosing] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => { setClosing(true); window.setTimeout(onClose, 160); }, [onClose]);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", key);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", key); document.body.style.overflow = overflow; prev?.focus?.(); };
  }, [close]);
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div aria-hidden onClick={close} className={`absolute inset-0 bg-black/50 ${closing ? "animate-out fade-out duration-150" : "animate-in fade-in duration-200"}`} />
      <div role="dialog" aria-modal="true" aria-label={title} className={`relative mt-auto flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-[28px] bg-card shadow-2xl sm:mt-0 sm:max-h-none sm:max-w-md sm:rounded-none sm:rounded-l-[28px] ${closing ? "animate-out fade-out slide-out-to-bottom-8 sm:slide-out-to-right-8 duration-150" : "animate-in fade-in slide-in-from-bottom-8 sm:slide-in-from-right-8 duration-200"}`}>
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h3 className="font-ui text-xl font-bold tracking-[-0.015em] text-ink">{title}</h3>
            {subtitle && <p className="mt-0.5 text-[15px] text-ink-2">{subtitle}</p>}
          </div>
          <button ref={closeRef} type="button" onClick={close} aria-label="Close details" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-idle-soft hover:text-ink"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-[15px] leading-relaxed text-ink">{children}</div>
      </div>
    </div>
  );
}
