"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { btnPrimary, btnSecondary, field, linkInline } from "@/components/recallmap/styles";
import {
  getAuthEndpoint,
  getAuthErrorMessage,
  signInWithPassword,
} from "@/lib/auth/api";
import { paths } from "@/utils/paths";

/** Sign-in UI backed by the configurable API contract when a backend is connected. */
export default function SignInScreen() {
  const router = useRouter();
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function handlePasswordSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      await signInWithPassword(
        String(form.get("email") || "").trim(),
        String(form.get("password") || ""),
      );
      router.replace(paths.dashboard);
    } catch (error) {
      setNotice(getAuthErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function handleGoogleSignIn() {
    setNotice("");
    try {
      window.location.assign(getAuthEndpoint("google"));
    } catch (error) {
      setNotice(getAuthErrorMessage(error));
    }
  }

  return (
    <div className="w-full max-w-md rounded-[28px] border border-line bg-card p-8 text-center shadow-[0_1px_2px_rgba(28,35,48,.06)] sm:p-10">
      <h1 className="font-ui text-[25px] font-bold tracking-[-0.02em] text-ink">Welcome to RecallMap</h1>
      <p className="mt-2 text-base text-ink-2">Understand more. Remember what matters.</p>
      <button
        type="button"
        onClick={handleGoogleSignIn}
        className={`${btnSecondary} mt-7 w-full py-3`}
      >
        Continue with Google
      </button>
      <div className="my-6 flex items-center gap-3 text-xs text-ink-3">
        <span className="h-px flex-1 bg-line" />
        <span>or continue with email</span>
        <span className="h-px flex-1 bg-line" />
      </div>
      <form onSubmit={handlePasswordSignIn} className="space-y-4 text-left">
        <label className="block font-ui text-sm font-semibold text-ink">
          Email
          <input className={`${field} mt-1.5`} name="email" type="email" autoComplete="email" required />
        </label>
        <label className="block font-ui text-sm font-semibold text-ink">
          Password
          <input className={`${field} mt-1.5`} name="password" type="password" autoComplete="current-password" required />
        </label>
        {notice && <p role="alert" className="rounded-xl bg-amber-soft px-4 py-2.5 text-sm text-amber-ink">{notice}</p>}
        <button type="submit" disabled={busy} className={`${btnPrimary} w-full py-3`}>
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <div className="mt-4 flex justify-between gap-4 text-left text-sm">
        <Link href={paths.forgotPassword} className={linkInline}>Forgot password?</Link>
        <Link href={paths.signup} className={linkInline}>Create account</Link>
      </div>
      <div className="my-6 h-px bg-line" />
      <Link href={paths.dashboard} className="font-ui text-[15px] font-semibold text-brand-text underline underline-offset-4 hover:no-underline">Explore the demo workspace</Link>
      <p className="mt-2 text-[13px] text-ink-3">Demo data is illustrative and not saved.</p>
    </div>
  );
}
