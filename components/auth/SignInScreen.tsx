"use client";

import { useState } from "react";
import Link from "next/link";
import { btnSecondary } from "@/components/recallmap/styles";
import { paths } from "@/utils/paths";

/**
 * Google sign-in UI. NOT CONNECTED: no auth backend exists yet, so clicking the
 * button never signs anyone in. Integration point: navigate to the backend's
 * Google OAuth start endpoint (see docs/API_CONTRACTS.md, GET /api/auth/google).
 */
export default function SignInScreen() {
  const [notice, setNotice] = useState("");
  return (
    <div className="w-full max-w-md rounded-[28px] border border-line bg-card p-8 text-center shadow-[0_1px_2px_rgba(28,35,48,.06)] sm:p-10">
      <h1 className="font-ui text-[25px] font-bold tracking-[-0.02em] text-ink">Welcome to RecallMap</h1>
      <p className="mt-2 text-base text-ink-2">Understand more. Remember what matters.</p>
      <button
        type="button"
        onClick={() => setNotice("Google sign-in is not connected yet. No account was created and you are not signed in.")}
        className={`${btnSecondary} mt-7 w-full py-3`}
      >
        Continue with Google
      </button>
      {notice && <p role="status" className="rm-enter mt-3 rounded-xl bg-amber-soft px-4 py-2.5 text-[14px] text-amber-ink">{notice}</p>}
      <div className="my-6 h-px bg-line" />
      <Link href={paths.dashboard} className="font-ui text-[15px] font-semibold text-brand-text underline underline-offset-4 hover:no-underline">Explore the demo workspace</Link>
      <p className="mt-2 text-[13px] text-ink-3">Demo data is illustrative and not saved.</p>
    </div>
  );
}
