"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { btnPrimary, field, linkInline } from "@/components/recallmap/styles";
import { getAuthErrorMessage, resetPassword } from "@/lib/auth/api";
import { paths } from "@/utils/paths";

export default function ResetPasswordForm({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirmation = String(form.get("confirmation") || "");
    if (password !== confirmation) {
      setError("The passwords do not match.");
      setBusy(false);
      return;
    }

    try {
      await resetPassword(token, password);
      setComplete(true);
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  if (complete) {
    return (
      <div>
        <p role="status" className="rounded-xl bg-brand-soft px-4 py-3 text-sm text-brand-text">
          Your password was changed by the backend. You can now sign in.
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
        New password
        <input
          className={`${field} mt-1.5`}
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>
      <label className="block font-ui text-sm font-semibold text-ink">
        Confirm new password
        <input
          className={`${field} mt-1.5`}
          name="confirmation"
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
        {busy ? "Updating..." : "Set new password"}
      </button>
    </form>
  );
}
