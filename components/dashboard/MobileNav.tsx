"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ellipsis } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { NAV_ITEMS, isActivePath } from "@/lib/recallmap/nav";

const barItems = NAV_ITEMS.filter((n) => n.mobile === "bar");
const moreItems = NAV_ITEMS.filter((n) => n.mobile === "more");
const tab = "flex h-14 flex-1 flex-col items-center justify-center gap-0.5 font-ui text-[11.5px] leading-none";

/** Fixed bottom navigation for small screens. Hidden from md up, where the sidebar takes over. */
export default function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const moreActive = moreItems.some((n) => isActivePath(pathname, n));

  return (
    <>
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden">
        <ul className="mx-auto flex max-w-lg">
          {barItems.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(pathname, item);
            return (
              <li key={item.href} className="flex flex-1">
                <Link href={item.href} aria-current={active ? "page" : undefined} className={`${tab} ${active ? "font-bold text-brand-text" : "font-medium text-ink-3"}`}>
                  <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${active ? "bg-brand-soft" : ""}`}><Icon className="h-5 w-5" aria-hidden /></span>
                  {item.short}
                </Link>
              </li>
            );
          })}
          <li className="flex flex-1">
            <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} className={`${tab} ${moreActive ? "font-bold text-brand-text" : "font-medium text-ink-3"}`}>
              <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${moreActive ? "bg-brand-soft" : ""}`}><Ellipsis className="h-5 w-5" aria-hidden /></span>
              More
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" showCloseButton={false} className="rounded-t-[24px] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 md:hidden">
          <span aria-hidden className="mx-auto h-1 w-10 rounded-full bg-line-strong" />
          <SheetTitle className="sr-only">More</SheetTitle>
          <ul className="grid gap-1">
            {moreItems.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(pathname, item);
              return (
                <li key={item.href}>
                  <Link href={item.href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined}
                    className={`flex h-12 items-center gap-3 rounded-xl px-3 font-ui text-[15px] ${active ? "bg-brand-soft font-bold text-brand-text" : "font-semibold text-ink hover:bg-canvas"}`}>
                    <Icon className={`h-5 w-5 ${active ? "text-brand" : "text-ink-3"}`} aria-hidden />{item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-1 border-t border-line pt-3"><ThemeToggle labels /></div>
        </SheetContent>
      </Sheet>
    </>
  );
}
