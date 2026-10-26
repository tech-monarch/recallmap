import { ReactNode } from "react";
import AuthNav from "./AuthNav";

/** Page chrome for the sign-in screen. */
export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-canvas">
      <span aria-hidden className="absolute -right-20 top-24 h-64 w-64 rounded-full bg-brand-soft" />
      <AuthNav />
      <div className="relative z-10 flex min-h-[calc(100vh-88px)] items-center justify-center px-6 pb-12 sm:px-10">
        {children}
      </div>
    </div>
  );
}
