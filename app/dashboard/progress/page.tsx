import { Suspense } from "react";
import ProgressView from "@/components/recallmap/ProgressView";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ProgressView />
    </Suspense>
  );
}
