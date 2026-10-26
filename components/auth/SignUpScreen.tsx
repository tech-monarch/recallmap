"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthCard from "@/components/auth/AuthCard";
import AuthShell from "@/components/auth/AuthShell";
import {
  getAuthErrorMessage,
  signUpWithPassword,
} from "@/lib/auth/api";
import { btnPrimary, field, linkInline } from "@/components/recallmap/styles";
import { paths } from "@/utils/paths";

export default function SignUpScreen() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      await signUpWithPassword(
        String(form.get("name") || "").trim(),
        String(form.get("email") || "").trim(),
        String(form.get("password") || ""),
      );
      router.replace(paths.dashboard);
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <AuthCard
        title="Create your account"
        subtitle="Start building a clearer picture of what you know."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block font-ui text-sm font-semibold text-ink">
            Name
            <input className={`${field} mt-1.5`} name="name" autoComplete="name" required />
          </label>
          <label className="block font-ui text-sm font-semibold text-ink">
            Email
            <input
              className={`${field} mt-1.5`}
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </label>
          <label className="block font-ui text-sm font-semibold text-ink">
            Password
            <input
              className={`${field} mt-1.5`}
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          {error && (
            <p role="alert" className="rounded-xl bg-amber-soft px-4 py-2.5 text-sm text-amber-ink">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy} className={`${btnPrimary} w-full py-3`}>
            {busy ? "Creating account..." : "Create account"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-ink-2">
          Already have an account?{" "}
          <Link href={paths.login} className={linkInline}>
            Sign in
          </Link>
        </p>
      </AuthCard>
    </AuthShell>
  );
}
