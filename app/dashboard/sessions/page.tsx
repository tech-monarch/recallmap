import { Suspense } from "react";
import SessionsView from "@/components/recallmap/SessionsView";

export default function Page() {
  return (
    <Suspense fallback={<p className="text-base text-ink-2">Loading…</p>}>
      <SessionsView />
    </Suspense>
  );
}
