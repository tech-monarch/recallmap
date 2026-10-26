"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isActivePath } from "@/lib/recallmap/nav";
import RecallMark from "@/components/recallmap/RecallMark";
import ThemeToggle from "@/components/theme/ThemeToggle";
import SidebarInspiration from "./SidebarInspiration";
import { useDisplayName } from "@/lib/recallmap/user";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarRail } from "@/components/ui/sidebar";

export function AppSidebar() {
  const pathname = usePathname();
  const displayName = useDisplayName();
  const userName = displayName ?? "Guest";
  const initials = userName.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "G";

  return (
    <Sidebar collapsible="offcanvas" className="border-r border-line bg-sidebar shadow-none" style={{ "--sidebar-width": "15.5rem", "--sidebar-width-icon": "4rem" } as React.CSSProperties}>
      <SidebarHeader className="px-4 pt-4 pb-2">
        <Link href="/dashboard" className="flex items-center gap-2.5 rounded-xl">
          <RecallMark className="h-8 w-8" />
          <span className="font-ui text-[18px] font-bold tracking-[-0.02em] text-ink">RecallMap</span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="py-3">
        <SidebarMenu className="gap-0.5 pr-3">
          {NAV_ITEMS.map((link) => {
            const Icon = link.icon;
            const isActive = isActivePath(pathname, link);
            return (
              <SidebarMenuItem key={link.name}>
                <Link href={link.href} aria-current={isActive ? "page" : undefined}
                  className={`group relative flex h-10 items-center gap-3 rounded-r-full pl-4 pr-4 font-ui text-[14.5px] transition-all duration-200 ${isActive ? "bg-brand-soft font-bold text-brand-text" : "font-medium text-ink-2 hover:bg-canvas hover:text-ink"}`}>
                  <span aria-hidden className={`absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-brand transition-all duration-200 ${isActive ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0"}`} />
                  <Icon className={`h-[18px] w-[18px] shrink-0 transition-all duration-200 ${isActive ? "text-brand" : "text-ink-3 group-hover:translate-x-0.5 group-hover:text-ink"}`} />
                  <span className="transition-transform duration-200 group-hover:translate-x-0.5">{link.name}</span>
                </Link>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="gap-3 border-t border-line p-3">
        <SidebarInspiration />
        <ThemeToggle />
        <div className="flex items-center gap-2.5 px-1">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-brand-soft font-ui text-[13px] font-bold text-brand-text">{initials}</div>
          <div className="min-w-0">
            <p className="truncate font-ui text-[13.5px] font-semibold text-ink">{userName}</p>
            <p className="truncate text-[12.5px] text-ink-3">Demo workspace</p>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
