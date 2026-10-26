import { Suspense } from "react";
import MapView from "@/components/recallmap/MapView";

export default function Page() {
  return (
    <Suspense fallback={<p className="text-base text-ink-2">Loading map…</p>}>
      <MapView />
    </Suspense>
  );
}
