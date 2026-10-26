import React from "react";
import DashboardLayoutWrapper from "@/components/dashboard/DashLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardLayoutWrapper>{children}</DashboardLayoutWrapper>;
}
