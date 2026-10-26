import Link from "next/link";
import RecallMark from "@/components/recallmap/RecallMark";
import { paths } from "@/utils/paths";

export default function AuthNav() {
  return (
    <header className="relative z-10 flex w-full items-center justify-between px-4 py-4 sm:px-8 lg:px-10">
      <Link href={paths.home} className="flex items-center gap-2.5 font-ui text-xl font-bold tracking-[-0.02em] text-ink">
        <RecallMark className="h-9 w-9" />
        RecallMap
      </Link>
    </header>
  );
}
