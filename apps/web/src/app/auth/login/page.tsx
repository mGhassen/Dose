"use client";

import { useState, useEffect } from "react";
import { Button } from "@kit/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@kit/ui/card";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Alert, AlertDescription } from "@kit/ui/alert";
import { Separator } from "@kit/ui/separator";
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@kit/hooks";
import { useAuth } from "@kit/hooks";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { login, loginWithGoogle, authError, loginError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check for success messages from searchParams
    const message = searchParams.get('message');
    const error = searchParams.get('error');
    const googleAuth = searchParams.get('google_auth');
    
    if (message === 'password-set-success') {
      setSuccess('Your password has been set successfully! You can now log in with your new password.');
    } else if (message === 'password-reset-success') {
      setSuccess('Your password has been reset successfully! You can now log in with your new password.');
    }
    
    // Handle Google OAuth success
    if (googleAuth === 'success') {
      // The Google OAuth flow completed successfully
      // The user should now be authenticated via Supabase
      // We'll let the useAuth hook handle the session verification
      setSuccess('Google authentication successful! Redirecting...');
    }
    
    // Handle Google OAuth errors
    if (error) {
      switch (error) {
        case 'oauth_error':
          setError('Google authentication was cancelled or failed. Please try again.');
          break;
        case 'no_code':
          setError('No authorization code received from Google. Please try again.');
          break;
        case 'exchange_failed':
          setError('Failed to exchange authorization code. Please try again.');
          break;
        case 'no_session':
          setError('No session created. Please try again.');
          break;
        case 'account_lookup_failed':
          setError('Failed to look up your account. Please try again.');
          break;
        case 'account_creation_failed':
          setError('Failed to create your account. Please try again.');
          break;
        case 'server_error':
          setError('Server error occurred. Please try again.');
          break;
        case 'callback-failed':
          setError('Authentication callback failed. Please try again.');
          break;
        default:
          setError('An error occurred during authentication. Please try again.');
      }
    }
  }, [searchParams]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess(""); // Clear success message when attempting login

    try {
      // Use the useAuth hook's login method which handles everything
      await login(email, password);
      
      // Check if login was successful (no error set)
      if (!loginError) {
        // Show success message
        toast({
          title: "Login successful!",
          description: "Redirecting you to your dashboard...",
        });
        // Note: The actual redirection is handled in the useAuth hook after successful login
      }
    } catch (err: unknown) {
      // Only catch unexpected errors (network issues, etc.)
      console.error('Unexpected login error:', err);
      setError('An unexpected error occurred. Please try again.');
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
      // The actual redirect is handled by the loginWithGoogle function
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "Failed to sign in with Google");
      } else {
        setError("Failed to sign in with Google");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrefilledLogin = async (email: string, password: string) => {
    setEmail(email);
    setPassword(password);
    setError("");
    setSuccess("");
    
    // Small delay to ensure state is updated before attempting login
    setTimeout(async () => {
      try {
        await login(email, password);
        
        // Check if login was successful (no error set)
        if (!loginError) {
          // Show success message
          toast({
            title: "Login successful!",
            description: "Redirecting you to your dashboard...",
          });
        }
      } catch (err: unknown) {
        // Only catch unexpected errors (network issues, etc.)
        console.error('Unexpected prefilled login error:', err);
        setError('An unexpected error occurred. Please try again.');
      }
    }, 100);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            Welcome to SunnyBudget
          </CardTitle>
          <CardDescription>Sign in to your account to continue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Show global auth error if present */}
          {authError && (
            <Alert variant="destructive" className="border-red-500 bg-red-50 dark:bg-red-950/20">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertDescription className="text-red-800 dark:text-red-200 font-medium">
                {authError}
              </AlertDescription>
            </Alert>
          )}
          {/* Show login error if present */}
          {loginError && !authError && (
            <Alert variant="destructive" className="border-red-500 bg-red-50 dark:bg-red-950/20">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertDescription className="text-red-800 dark:text-red-200 font-medium">
                {loginError.message}
              </AlertDescription>
            </Alert>
          )}
          {/* Show local error if present and no other errors */}
          {error && !authError && !loginError && (
            <Alert variant="destructive" className="border-red-500 bg-red-50 dark:bg-red-950/20">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertDescription className="text-red-800 dark:text-red-200 font-medium">
                {error}
              </AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert variant="default" className="border-green-500 bg-green-50 dark:bg-green-950/20">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200 font-medium">
                {success}
              </AlertDescription>
            </Alert>
          )}

          {/* Email Login Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
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
                  className="p-0 h-auto text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => router.push('/auth/forgot-password')}
                  type="button"
                >
                  Forgot your password?
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Sign In
            </Button>
          </form>

          {process.env.NEXT_PUBLIC_ENV === "development" && (
            <div className="mt-6 space-y-4">
              <Separator />
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center">
                  Quick Login (Development) - Test Different Roles
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePrefilledLogin("admin@sunnybudget.com", "password123")}
                    disabled={isLoading}
                    className="text-xs"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      "Admin"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePrefilledLogin("manager@sunnybudget.com", "password123")}
                    disabled={isLoading}
                    className="text-xs"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      "Manager"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePrefilledLogin("user@sunnybudget.com", "password123")}
                    disabled={isLoading}
                    className="text-xs"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      "User"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePrefilledLogin("analyst@sunnybudget.com", "password123")}
                    disabled={isLoading}
                    className="text-xs"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      "Analyst"
                    )}
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground text-center space-y-1">
                  <p><strong>Admin:</strong> Full access to all features</p>
                  <p><strong>Manager:</strong> Administrative access</p>
                  <p><strong>User/Analyst:</strong> Standard user access</p>
                </div>
              </div>
            </div>
          )}

          <div className="text-center mt-4">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Button
                variant="link"
                className="p-0 font-normal"
                onClick={() => router.push('/auth/register')}
              >
                Sign up
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}