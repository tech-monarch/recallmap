import AuthShell from "@/components/auth/AuthShell";
import AuthCard from "@/components/auth/AuthCard";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const metadata = { title: "Forgot password · RecallMap" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <AuthCard
        title="Forgot your password?"
        subtitle="Enter your email and we'll send you a link to reset it."
        
      >
        <ForgotPasswordForm />
      </AuthCard>
    </AuthShell>
  );
}
