"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@kit/ui/button";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Alert, AlertDescription } from "@kit/ui/alert";
import { Separator } from "@kit/ui/separator";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@kit/hooks";
import { useAuth } from "@kit/hooks";

type LoginPageClientProps = { loginImages: string[] };

export function LoginPageClient({ loginImages }: LoginPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { login, loginWithGoogle, authError, loginError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const defaultImage = loginImages[0] ?? "";
  const [coverImage, setCoverImage] = useState(defaultImage);

  useEffect(() => {
    if (loginImages.length > 0) {
      setCoverImage(
        loginImages[Math.floor(Math.random() * loginImages.length)]
      );
    }
  }, [loginImages]);

  useEffect(() => {
    const message = searchParams.get("message");
    const errorParam = searchParams.get("error");
    const googleAuth = searchParams.get("google_auth");

    if (message === "password-set-success") {
      setSuccess(
        "Your password has been set successfully! You can now log in with your new password."
      );
    } else if (message === "password-reset-success") {
      setSuccess(
        "Your password has been reset successfully! You can now log in with your new password."
      );
    }

    if (googleAuth === "success") {
      setSuccess("Google authentication successful! Redirecting...");
    }

    if (errorParam) {
      switch (errorParam) {
        case "oauth_error":
          setError(
            "Google authentication was cancelled or failed. Please try again."
          );
          break;
        case "no_code":
          setError(
            "No authorization code received from Google. Please try again."
          );
          break;
        case "exchange_failed":
          setError("Failed to exchange authorization code. Please try again.");
          break;
        case "no_session":
          setError("No session created. Please try again.");
          break;
        case "account_lookup_failed":
          setError("Failed to look up your account. Please try again.");
          break;
        case "account_creation_failed":
          setError("Failed to create your account. Please try again.");
          break;
        case "server_error":
          setError("Server error occurred. Please try again.");
          break;
        case "callback-failed":
          setError("Authentication callback failed. Please try again.");
          break;
        default:
          setError(
            "An error occurred during authentication. Please try again."
          );
      }
    }
  }, [searchParams]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      await login(email, password);
      if (!loginError) {
        toast({
          title: "Login successful!",
          description: "Redirecting you to your dashboard...",
        });
      }
    } catch (err: unknown) {
      console.error("Unexpected login error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");
    try {
      await loginWithGoogle();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to sign in with Google"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrefilledLogin = async (email: string, password: string) => {
    setEmail(email);
    setPassword(password);
    setError("");
    setSuccess("");
    setTimeout(async () => {
      try {
        await login(email, password);
        if (!loginError) {
          toast({
            title: "Login successful!",
            description: "Redirecting you to your dashboard...",
          });
        }
      } catch (err: unknown) {
        console.error("Unexpected prefilled login error:", err);
        setError("An unexpected error occurred. Please try again.");
      }
    }, 100);
  };

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 bg-background p-8 md:p-12">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link
            href="/"
            className="flex items-center gap-2 font-medium text-foreground"
          >
            <div className="relative size-24">
              <Image
                src="/logo_light.png"
                alt="Dose"
                fill
                className="object-contain dark:hidden"
              />
              <Image
                src="/logo_dark.png"
                alt="Dose"
                fill
                className="hidden object-contain dark:block"
              />
            </div>
          </Link>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="w-full max-w-sm space-y-8">
            <div className="space-y-2 text-center">
              <h1 className="text-3xl font-bold">Welcome back</h1>
              <p className="text-base text-muted-foreground">
                Sign in to your account to continue
              </p>
            </div>

            {authError && (
              <Alert
                variant="destructive"
                className="border-red-500 bg-red-50 dark:bg-red-950/20"
              >
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertDescription className="font-medium text-red-800 dark:text-red-200">
                  {authError}
                </AlertDescription>
              </Alert>
            )}
            {loginError && !authError && (
              <Alert
                variant="destructive"
                className="border-red-500 bg-red-50 dark:bg-red-950/20"
              >
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertDescription className="font-medium text-red-800 dark:text-red-200">
                  {loginError.message}
                </AlertDescription>
              </Alert>
            )}
            {error && !authError && !loginError && (
              <Alert
                variant="destructive"
                className="border-red-500 bg-red-50 dark:bg-red-950/20"
              >
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertDescription className="font-medium text-red-800 dark:text-red-200">
                  {error}
                </AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert
                variant="default"
                className="border-green-500 bg-green-50 dark:bg-green-950/20"
              >
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="font-medium text-green-800 dark:text-green-200">
                  {success}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleEmailLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
                <div className="text-right">
                  <Button
                    variant="link"
                    className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => router.push("/auth/forgot-password")}
                    type="button"
                  >
                    Forgot your password?
                  </Button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Sign In
              </Button>
            </form>

            {process.env.NEXT_PUBLIC_ENV === "development" && (
              <div className="mt-6 space-y-4">
                <Separator />
                <div className="space-y-2">
                  <p className="text-center text-sm text-muted-foreground">
                    Quick Login (Development) - Test Different Roles
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handlePrefilledLogin("admin@dose.com", "password123")
                      }
                      disabled={isLoading}
                      className="text-xs"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          Logging in...
                        </>
                      ) : (
                        "Admin"
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handlePrefilledLogin(
                          "manager@dose.com",
                          "password123"
                        )
                      }
                      disabled={isLoading}
                      className="text-xs"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          Logging in...
                        </>
                      ) : (
                        "Manager"
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handlePrefilledLogin("user@dose.com", "password123")
                      }
                      disabled={isLoading}
                      className="text-xs"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          Logging in...
                        </>
                      ) : (
                        "User"
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handlePrefilledLogin(
                          "analyst@dose.com",
                          "password123"
                        )
                      }
                      disabled={isLoading}
                      className="text-xs"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          Logging in...
                        </>
                      ) : (
                        "Analyst"
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handlePrefilledLogin(
                          "pending@dose.com",
                          "password123"
                        )
                      }
                      disabled={isLoading}
                      className="text-xs col-span-2"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          Logging in...
                        </>
                      ) : (
                        "Pending"
                      )}
                    </Button>
                  </div>
                  <div className="space-y-1 text-center text-xs text-muted-foreground">
                    <p>
                      <strong>Admin:</strong> Full access to all features
                    </p>
                    <p>
                      <strong>Manager:</strong> Administrative access
                    </p>
                    <p>
                      <strong>User/Analyst:</strong> Standard user access
                    </p>
                    <p>
                      <strong>Pending:</strong> Profile status pending (approval
                      flow)
                    </p>
                  </div>
                </div>
              </div>
            )}

            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Button
                variant="link"
                className="p-0 font-normal"
                onClick={() => router.push("/auth/register")}
              >
                Sign up
              </Button>
            </p>
          </div>
        </div>
      </div>
      {loginImages.length > 0 && (
        <div className="relative hidden min-h-0 flex-col rounded-l-2xl bg-background p-6 md:p-8 lg:flex lg:min-h-svh">
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl">
            <Image
              src={coverImage}
              alt=""
              fill
              className="object-cover dark:brightness-[0.2] dark:grayscale"
              priority
            />
          </div>
        </div>
      )}
    </div>
  );
}
