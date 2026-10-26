import Link from "next/link";
import { LinkIcon } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import AuthCard from "@/components/auth/AuthCard";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import { paths } from "@/utils/paths";

export const metadata = { title: "Reset password · RecallMap" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const value = (await searchParams).token;
  const token = Array.isArray(value) ? value[0] : value;

  if (!token) {
    return (
      <AuthShell>
        <AuthCard
          title="Reset link unavailable"
          subtitle="This link is missing its reset token. Request a new link to continue."
        >
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#fff5f4] text-[#d92d20]">
              <LinkIcon className="h-6 w-6" />
            </div>
            <Link
              href={paths.forgotPassword}
              className="mt-6 flex w-full items-center justify-center rounded-xl bg-[#9fe870] px-4 py-3 text-sm font-semibold text-[#163300] shadow-[0_8px_24px_rgba(159,232,112,0.3)] transition-all duration-200 hover:bg-[#aaf17c]"
            >
              Request a new reset link
            </Link>
          </div>
        </AuthCard>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthCard
        title="Choose a new password"
        subtitle="Use at least 8 characters."
      >
        <ResetPasswordForm token={token} />
      </AuthCard>
    </AuthShell>
  );
}
