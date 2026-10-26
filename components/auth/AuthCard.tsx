import type { ReactNode } from "react";

export default function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="w-full max-w-md rounded-[28px] border border-line bg-card p-8 shadow-[0_1px_2px_rgba(28,35,48,.06)] sm:p-10">
      <h1 className="font-ui text-center text-[25px] font-bold tracking-[-0.02em] text-ink">
        {title}
      </h1>
      <p className="mt-2 text-center text-base text-ink-2">{subtitle}</p>
      <div className="mt-7">{children}</div>
    </section>
  );
}
