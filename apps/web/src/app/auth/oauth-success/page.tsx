"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@kit/ui/card";
import { Button } from "@kit/ui/button";
import { Alert, AlertDescription } from "@kit/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@kit/hooks";

export default function OAuthSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { completeGoogleRegistration } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const accessToken = searchParams.get("access_token");
    const refreshToken = searchParams.get("refresh_token");

    if (!accessToken) {
      setError("No session created. Please try again.");
      return;
    }

    const completeLogin = async () => {
      try {
        await completeGoogleRegistration({
          access_token: accessToken,
          refresh_token: refreshToken || undefined,
        });

        const returnTo = sessionStorage.getItem("oauth_return_to");
        sessionStorage.removeItem("oauth_return_to");

        router.replace(returnTo ? decodeURIComponent(returnTo) : "/dashboard");
      } catch {
        setError("Failed to complete sign in. Please try again.");
      }
    };

    completeLogin();
  }, [searchParams, completeGoogleRegistration, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-green-600">
            {error ? "Sign in failed" : "Authentication Successful!"}
          </CardTitle>
          <CardDescription>
            {error
              ? "Something went wrong during sign in."
              : "You have been successfully authenticated. Redirecting..."}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {error ? (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <Button asChild className="w-full">
                <Link href="/auth/login">Back to sign in</Link>
              </Button>
            </div>
          ) : (
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-green-600" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
