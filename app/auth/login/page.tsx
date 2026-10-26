import AuthShell from "@/components/auth/AuthShell";
import SignInScreen from "@/components/auth/SignInScreen";

export const metadata = { title: "Sign in · RecallMap" };

export default function LoginPage() {
  return (
    <AuthShell>
      <SignInScreen />
    </AuthShell>
  );
}
