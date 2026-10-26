"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { btnPrimary, field, linkInline } from "@/components/recallmap/styles";
import { getAuthErrorMessage, requestPasswordReset } from "@/lib/auth/api";
import { paths } from "@/utils/paths";

export default function ForgotPasswordForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const redirectUrl = new URL(
        paths.resetPassword,
        window.location.origin,
      ).toString();
      await requestPasswordReset(
        String(form.get("email") || "").trim(),
        redirectUrl,
      );
      setSent(true);
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div>
        <p role="status" className="rounded-xl bg-brand-soft px-4 py-3 text-sm text-brand-text">
          If an account matches that email, the backend will send a password reset link.
        </p>
        <Link href={paths.login} className={`${linkInline} mt-5 block text-center`}>
          Return to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
      {error && (
        <p role="alert" className="rounded-xl bg-amber-soft px-4 py-2.5 text-sm text-amber-ink">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className={`${btnPrimary} w-full py-3`}>
        {busy ? "Sending..." : "Send reset link"}
      </button>
      <p className="text-center text-sm">
        <Link href={paths.login} className={linkInline}>
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
