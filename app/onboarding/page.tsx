import Link from "next/link";
import RecallMark from "@/components/recallmap/RecallMark";
import { btnPrimary } from "@/components/recallmap/styles";
import { paths } from "@/utils/paths";

/** Placeholder. Real onboarding (profile, subjects, goals, explanation style) is milestone 6. */
export default function OnboardingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6">
      <RecallMark className="h-14 w-14" />
      <h1 className="mt-5 font-ui text-3xl font-bold tracking-[-0.02em] text-ink">Welcome to RecallMap</h1>
      <p className="mt-2 max-w-sm text-center text-base text-ink-2">Onboarding is not built yet.</p>
      <Link href={paths.dashboard} className={`${btnPrimary} mt-7`}>Open workspace</Link>
    </main>
  );
}
