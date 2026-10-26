import { paths } from "@/utils/paths";
import Link from "next/link";
import RecallMark from "@/components/recallmap/RecallMark";

type BrandMarkProps = {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  href?: string;
};

export default function BrandMark({
  className = "",
  iconClassName = "h-11 w-11",
  textClassName = "text-3xl sm:text-5xl",
  href = paths.home,
}: BrandMarkProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-4 font-ui ${className}`}
    >
      <RecallMark className="h-11 w-11" />

      <span
        className={`whitespace-nowrap font-semibold tracking-tighter text-ink ${textClassName}`}
      >
        RecallMap
      </span>
    </Link>
  );
}