"use client";

import { usePathname } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./Sidebar";
import MobileNav from "./MobileNav";
import { TooltipProvider } from "../ui/tooltip";
import DashNav from "@/app/dashboard/DashNav";
import { LibraryProvider } from "@/lib/recallmap/library-store";
import { PreferencesProvider } from "@/lib/recallmap/preferences-store";

export default function DashboardLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen>
        <AppSidebar />
        <main className="flex min-w-0 flex-1 flex-col overflow-auto bg-canvas">
          <DashNav />
          <div className="mx-auto w-full max-w-6xl flex-1 px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-6 sm:px-5 md:px-8 md:pb-10 md:pt-7"><PreferencesProvider><LibraryProvider><div key={pathname} className="rm-enter">{children}</div></LibraryProvider></PreferencesProvider></div>
        </main>
        <MobileNav />
      </SidebarProvider>
    </TooltipProvider>
  );
}
