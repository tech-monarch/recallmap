"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import type { Concept, UnderstandingState } from "@/lib/recallmap/types";
import { DEMO_MAP_LAYOUT } from "@/lib/recallmap/demo-data";
import { ancestorsOf, stateOf } from "@/lib/recallmap/knowledge";
import { STATE_META } from "@/lib/recallmap/state";

const W = 800, H = 480, R = 26;
const BRAND = "var(--brand)", EDGE = "var(--edge)";
const pos = (id: string) => ({ x: (DEMO_MAP_LAYOUT[id]?.x ?? 50) * 7.2 + 40, y: (DEMO_MAP_LAYOUT[id]?.y ?? 50) * 4.0 + 40 });

/** One silhouette per state: circle = demonstrated, rounded square = partial, diamond = suspected gap (an inference), dashed circle = not yet assessed. */
function Shape({ state }: { state: UnderstandingState }) {
  const c = STATE_META[state].hex;
  switch (state) {
    case "demonstrated":
      return <><circle r={R} fill={c} /><path d="M-8 0.5 -2.5 6 9 -6" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" /></>;
    case "partial":
      return <><rect x={-R} y={-R} width={R * 2} height={R * 2} rx="14" fill={c} /><path d="M0 -10 A10 10 0 0 0 0 10 Z" fill="#1c2330" /><circle r="10" fill="none" stroke="#1c2330" strokeWidth="2.2" /></>;
    case "suspected-gap":
      return <><rect x={-R + 3} y={-R + 3} width={(R - 3) * 2} height={(R - 3) * 2} rx="9" fill={c} transform="rotate(45)" /><text textAnchor="middle" dy="6" fontSize="19" fontWeight="800" fill="#fff" className="font-ui">!</text></>;
    default:
      return <><circle r={R - 1} fill="var(--card)" stroke="var(--ink-3)" strokeWidth="2.4" strokeDasharray="5 4" /><path d="M-7 0H7" stroke="var(--ink-3)" strokeWidth="2.4" strokeLinecap="round" /></>;
  }
}

/** Lightweight interactive graph: SVG, drag to pan, wheel/buttons to zoom, click or Enter to select. On touch screens the map scrolls natively and the buttons zoom. */
export default function KnowledgeGraph({ concepts, selectedId, onSelect }: { concepts: Concept[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const [t, setT] = useState({ x: 0, y: 0, k: 1 });
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  const ancestors = useMemo(() => (selectedId ? ancestorsOf(selectedId) : null), [selectedId]);
  const chain = useMemo(() => (selectedId && ancestors ? new Set([selectedId, ...ancestors]) : null), [selectedId, ancestors]);
  const topics = useMemo(() => {
    const by = new Map<string, Concept[]>();
    concepts.forEach((c) => by.set(c.topic, [...(by.get(c.topic) ?? []), c]));
    return [...by].map(([topic, cs]) => {
      const ps = cs.map((c) => pos(c.id));
      const x1 = Math.min(...ps.map((p) => p.x)) - 46, x2 = Math.max(...ps.map((p) => p.x)) + 46;
      const y1 = Math.min(...ps.map((p) => p.y)) - 52, y2 = Math.max(...ps.map((p) => p.y)) + 58;
      return { topic, x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
    });
  }, [concepts]);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaY) < 1) return;
      e.preventDefault();
      setT((p) => ({ ...p, k: Math.min(2.2, Math.max(0.6, p.k * (e.deltaY < 0 ? 1.1 : 0.9))) }));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const zoom = (f: number) => setT((p) => ({ ...p, k: Math.min(2.2, Math.max(0.6, p.k * f)) }));
  const btn = "flex h-9 w-9 items-center justify-center rounded-full border border-line-strong bg-card text-ink transition-colors hover:border-brand hover:bg-brand-soft hover:text-brand-text";

  return (
    <div ref={wrap} className="relative overflow-hidden rounded-[28px] border border-line bg-card">
      <div className="absolute right-3 top-3 z-10 flex flex-col gap-1.5">
        <button className={btn} onClick={() => zoom(1.2)} aria-label="Zoom in"><Plus className="h-4 w-4" /></button>
        <button className={btn} onClick={() => zoom(1 / 1.2)} aria-label="Zoom out"><Minus className="h-4 w-4" /></button>
        <button className={btn} onClick={() => setT({ x: 0, y: 0, k: 1 })} aria-label="Reset view"><RotateCcw className="h-4 w-4" /></button>
      </div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`} className="h-[400px] w-full min-w-[640px] cursor-grab touch-pan-x touch-pan-y select-none active:cursor-grabbing sm:h-[470px]" role="group" aria-label="Knowledge map. Drag to pan, scroll to zoom. Select a concept for details."
          onPointerDown={(e) => { if (e.pointerType === "touch") return; drag.current = { sx: e.clientX, sy: e.clientY, ox: t.x, oy: t.y, moved: false }; }}
          onPointerMove={(e) => {
            const d = drag.current; if (!d) return;
            const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
            if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
            if (d.moved) setT((p) => ({ ...p, x: d.ox + dx, y: d.oy + dy }));
          }}
          onPointerUp={() => { window.setTimeout(() => { drag.current = null; }, 0); }} onPointerLeave={() => { drag.current = null; }}
        >
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill={EDGE} /></marker>
            <marker id="arrow-hi" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill={BRAND} /></marker>
          </defs>
          <g transform={`translate(${t.x} ${t.y}) scale(${t.k})`} style={{ transformOrigin: "center" }}>
            {topics.map((g) => (
              <g key={g.topic} aria-hidden="true">
                <rect x={g.x} y={g.y} width={g.w} height={g.h} rx="26" fill="var(--canvas)" stroke="var(--line)" />
                <text x={g.x + 18} y={g.y + 22} fontSize="12" fontWeight="800" letterSpacing="1.2" fill="var(--ink-3)" className="font-ui">{g.topic.toUpperCase()}</text>
              </g>
            ))}
            {concepts.flatMap((c) => c.prerequisites.filter((p) => concepts.some((x) => x.id === p)).map((p) => {
              const a = pos(p), b = pos(c.id);
              const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
              const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
              const hi = !!chain && chain.has(c.id) && chain.has(p);
              return <line key={`${p}>${c.id}`} className="rm-edge" x1={a.x + ux * (R + 6)} y1={a.y + uy * (R + 6)} x2={b.x - ux * (R + 10)} y2={b.y - uy * (R + 10)} stroke={hi ? BRAND : EDGE} strokeWidth={hi ? 3 : 1.8} opacity={chain && !hi ? 0.3 : 1} markerEnd={hi ? "url(#arrow-hi)" : "url(#arrow)"} />;
            }))}
            {concepts.map((c) => {
              const { x, y } = pos(c.id);
              const st = stateOf(c.id);
              const sel = c.id === selectedId;
              const pre = !!ancestors && ancestors.has(c.id);
              const dim = !!chain && !chain.has(c.id);
              return (
                <g key={c.id} transform={`translate(${x} ${y})`} tabIndex={0} role="button" aria-pressed={sel} aria-label={`${c.name}: ${STATE_META[st].label}`} className="rm-fade cursor-pointer outline-none [&:focus-visible_.rm-focus]:stroke-brand-text" style={{ opacity: dim ? 0.35 : 1 }}
                  onClick={() => { if (!drag.current?.moved) onSelect(c.id); }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(c.id); } }}>
                  <g className="rm-node">
                    <circle className="rm-focus" r={R + 9} fill="none" strokeWidth="3" stroke={sel ? BRAND : pre ? "var(--brand-line)" : "transparent"} strokeDasharray={pre && !sel ? "4 4" : undefined} style={{ transition: "stroke .22s" }} />
                    <Shape state={st} />
                    <text textAnchor="middle" y={R + 26} fontSize="15" fontWeight="700" fill="var(--ink)" stroke="var(--card)" strokeWidth="5" paintOrder="stroke" strokeLinejoin="round" className="font-ui">{c.name}</text>
                  </g>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
