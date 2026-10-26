/** Shared class recipes. One place for the shape language so components stay coherent.
 *  Radii: feature panels 28px, progress cards 24px, compact panels 12px, inputs 10px, primary buttons pill. */
export const shadowSm = "shadow-[0_1px_2px_rgba(16,24,40,.06)]";

export const btnPrimary = "inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 font-ui text-sm font-semibold text-white transition-all duration-150 hover:-translate-y-px hover:bg-brand-deep active:translate-y-0 disabled:pointer-events-none disabled:opacity-40";
export const btnSecondary = "inline-flex items-center justify-center gap-2 rounded-[10px] border border-line-strong bg-card px-4 py-2.5 font-ui text-sm font-semibold text-ink transition-all duration-150 hover:border-brand hover:bg-brand-soft hover:text-brand-text disabled:pointer-events-none disabled:opacity-40";
export const btnSoft = "inline-flex items-center justify-center gap-2 rounded-[10px] bg-brand-soft px-4 py-2.5 font-ui text-sm font-semibold text-brand-text transition-colors duration-150 hover:bg-brand-line disabled:pointer-events-none disabled:opacity-40";
export const linkInline = "font-ui text-sm font-semibold text-brand-text underline-offset-4 hover:underline";

export const field = "w-full rounded-[10px] border border-line-strong bg-card px-3.5 py-2.5 text-base text-ink placeholder:text-ink-3 transition-colors hover:border-ink-3 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";
export const select = "cursor-pointer rounded-[10px] border border-line-strong bg-card px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink-3 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";

export const panel = `rounded-xl border border-line bg-card ${shadowSm}`;
export const featurePanel = `rounded-[28px] border border-line bg-card ${shadowSm}`;
export const cardTitle = "font-ui text-[16px] font-bold tracking-[-0.01em] text-ink";
export const eyebrow = "font-ui text-[12.5px] font-semibold uppercase tracking-[0.1em] text-ink-3";
