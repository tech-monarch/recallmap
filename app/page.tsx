import Link from "next/link";
import RecallMark from "@/components/recallmap/RecallMark";
import { btnPrimary, btnSecondary } from "@/components/recallmap/styles";
import { paths } from "@/utils/paths";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-canvas px-6 py-16">
      <span aria-hidden className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-soft" />
      <span aria-hidden className="absolute -bottom-16 -right-10 h-56 w-56 rotate-12 rounded-[56px] bg-brand-soft" />
      <div className="relative flex flex-col items-center text-center">
        <RecallMark className="h-16 w-16" />
        <h1 className="mt-6 font-ui text-5xl font-bold tracking-[-0.04em] text-ink sm:text-6xl">RecallMap</h1>
        <p className="mt-4 max-w-md text-xl text-ink-2">Understand more. Remember what matters.</p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link href={paths.login} className={btnPrimary}>Sign in</Link>
          <Link href={paths.dashboard} className={btnSecondary}>Open workspace</Link>
        </div>
      </div>
    </main>
  );
}
