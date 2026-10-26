import { createClient } from "@/lib/supabase/server";
import { getSafeNextPath } from "@/lib/auth/safe-redirect";
import { paths } from "@/utils/paths";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Only same-site paths are honoured; anything else is ignored.
  const safeNext = getSafeNextPath(searchParams.get("next"));

  // An expired/used/cross-device recovery link has no usable code. Send the user
  // to the reset page, which shows "This link has expired" with a way forward.
  const failureRedirect =
    safeNext && new URL(safeNext, origin).pathname === paths.resetPassword
      ? `${origin}${paths.resetPassword}`
      : `${origin}/auth/login?error=auth`;

  if (!code) {
    return NextResponse.redirect(failureRedirect);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(failureRedirect);
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.redirect(`${origin}/auth/login?error=auth`);
  }

  // Honour a validated `next` (e.g. the password-reset page).
  if (safeNext) {
    return NextResponse.redirect(`${origin}${safeNext}`);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Profile lookup error during auth callback:", profileError);
  }

  const redirectPath = profile ? "/dashboard" : "/onboarding";
  return NextResponse.redirect(`${origin}${redirectPath}`);
}
