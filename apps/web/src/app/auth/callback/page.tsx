"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@kit/ui/card";
import { Loader2 } from "lucide-react";

async function finishOAuthSession(
  router: ReturnType<typeof useRouter>,
  session: { access_token: string; refresh_token?: string | null }
) {
  const res = await fetch("/api/auth/oauth/complete", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    router.replace(`/auth/login?error=${data.error || "callback-failed"}`);
    return;
  }

  if (data.redirectTo === "/auth/waiting-approval") {
    router.replace("/auth/waiting-approval");
    return;
  }

  if (data.redirectTo === "/auth/account-status") {
    router.replace("/auth/account-status");
    return;
  }

  await fetch("/api/auth/sync-cookie", {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
    credentials: "include",
  }).catch(() => {});

  const successUrl = new URL("/auth/oauth-success", window.location.origin);
  successUrl.searchParams.set("access_token", session.access_token);
  successUrl.searchParams.set("refresh_token", session.refresh_token ?? "");
  router.replace(successUrl.toString());
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const oauthError = params.get("error");

      if (oauthError) {
        router.replace(
          `/auth/login?error=oauth_error&message=${encodeURIComponent(oauthError)}`
        );
        return;
      }

      const type = params.get("type");
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (type === "recovery" && accessToken && refreshToken) {
        router.replace(
          `/auth/reset-password?access_token=${accessToken}&refresh_token=${refreshToken}`
        );
        return;
      }

      if (type === "signup" && accessToken && refreshToken) {
        router.replace(
          `/auth/accept-invitation?access_token=${accessToken}&refresh_token=${refreshToken}`
        );
        return;
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseAnonKey) {
        router.replace("/auth/login?error=server_error");
        return;
      }

      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          detectSessionInUrl: true,
          flowType: "pkce",
        },
      });

      const code = params.get("code");
      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          console.error("OAuth code exchange failed:", exchangeError);
          router.replace("/auth/login?error=exchange_failed");
          return;
        }
      } else {
        const hashParams = new URLSearchParams(
          window.location.hash.replace(/^#/, "")
        );
        const hashAccessToken = hashParams.get("access_token");
        const hashRefreshToken = hashParams.get("refresh_token");
        if (hashAccessToken && hashRefreshToken) {
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: hashAccessToken,
            refresh_token: hashRefreshToken,
          });
          if (setSessionError) {
            console.error("OAuth hash session failed:", setSessionError);
            router.replace("/auth/login?error=exchange_failed");
            return;
          }
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/auth/login?error=no_code");
        return;
      }

      await finishOAuthSession(router, session);
    };

    run();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Signing you in...</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    </div>
  );
}
