"use client";

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useTheme, type ThemeChoice } from "@/lib/recallmap/theme";

const OPTIONS: { id: ThemeChoice; label: string; icon: LucideIcon }[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
];

/** Three-way theme switch. `labels` shows text beside each icon (used in the mobile menu). */
export default function ThemeToggle({ labels = false, className = "" }: { labels?: boolean; className?: string }) {
  const { theme, setTheme } = useTheme();
  return (
    <div role="radiogroup" aria-label="Theme" className={`flex gap-0.5 rounded-full border border-line bg-canvas p-0.5 ${className}`}>
      {OPTIONS.map(({ id, label, icon: Icon }) => {
        const on = theme === id;
        return (
          <button key={id} type="button" role="radio" aria-checked={on} aria-label={label} title={label} onClick={() => setTheme(id)}
            className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-full px-2.5 font-ui text-[13px] font-semibold ${on ? "bg-card text-brand-text shadow-[0_1px_2px_rgba(16,24,40,.12)]" : "text-ink-3 hover:text-ink"}`}>
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {labels && <span>{label}</span>}
          </button>
        );
      })}
    </div>
  );
}
