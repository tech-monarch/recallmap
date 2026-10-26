"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import RecallMark from "@/components/recallmap/RecallMark";
import { titleForPath } from "@/lib/recallmap/nav";

export default function DashNav() {
  const title = titleForPath(usePathname());
  return (
    <header className="sticky top-0 z-20 flex h-14 w-full shrink-0 items-center gap-3 border-b border-line bg-canvas/95 px-4 pt-[env(safe-area-inset-top)] sm:px-5 md:px-8">
      {/* Phones use the bottom bar, so the sidebar toggle only appears from md up. */}
      <RecallMark className="h-7 w-7 shrink-0 md:hidden" />
      <SidebarTrigger aria-label="Toggle sidebar" className="hidden h-9 w-9 shrink-0 rounded-xl text-ink-2 hover:bg-card hover:text-ink md:inline-flex" />
      <span aria-hidden className="hidden h-5 w-px bg-line-strong md:block" />
      <p className="truncate font-ui text-[15px] font-semibold text-ink-2">{title}</p>
    </header>
  );
}
