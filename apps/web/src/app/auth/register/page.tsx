"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from "@smartlogbook/hooks";
import { Button } from "@smartlogbook/ui/button";
import { Input } from "@smartlogbook/ui/input";
import { Label } from "@smartlogbook/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@smartlogbook/ui/card";
import { Alert, AlertDescription } from "@smartlogbook/ui/alert";
import { Dumbbell, AlertCircle, CheckCircle } from "lucide-react";
import Link from "next/link";

interface GoogleUserData {
  email: string;
  first_name: string;
  last_name: string;
  avatar_url: string;
  google_id: string;
  access_token: string;
  refresh_token: string;
}

export default function Register() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register, completeGoogleRegistration } = useAuth();
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGoogleAuth, setIsGoogleAuth] = useState(false);
  const [googleData, setGoogleData] = useState<GoogleUserData | null>(null);

  // Handle Google OAuth pre-filled data
  useEffect(() => {
    const googleAuth = searchParams.get('google_auth');
    const email = searchParams.get('email');
    const firstName = searchParams.get('first_name');
    const lastName = searchParams.get('last_name');
    const avatarUrl = searchParams.get('avatar_url');
    const googleId = searchParams.get('google_id');
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');

    if (googleAuth === 'success' && email && firstName) {
      setIsGoogleAuth(true);
      setGoogleData({
        email: email,
        first_name: firstName,
        last_name: lastName || '',
        avatar_url: avatarUrl || '',
        google_id: googleId || '',
        access_token: '', // Not needed for server-side handling
        refresh_token: '' // Not needed for server-side handling
      });

      // Pre-fill the form with Google data
      setCredentials({
        email: email,
        password: '', // Don't pre-fill password for Google users
        firstName: firstName,
        lastName: lastName || ''
      });

      // Clean up URL parameters
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('google_auth');
      newUrl.searchParams.delete('email');
      newUrl.searchParams.delete('first_name');
      newUrl.searchParams.delete('last_name');
      newUrl.searchParams.delete('avatar_url');
      newUrl.searchParams.delete('google_id');
      newUrl.searchParams.delete('access_token');
      newUrl.searchParams.delete('refresh_token');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (isGoogleAuth && googleData) {
        // Handle Google user registration
        const result = await registerGoogleUser({
          email: credentials.email,
          firstName: credentials.firstName,
          lastName: credentials.lastName,
          googleData: googleData
        });

        // Complete the Google registration in auth hook
        await completeGoogleRegistration(googleData);
        
        // Redirect to appropriate dashboard based on user role
        if (result.account.accessible_portals?.includes('admin')) {
          router.push('/dashboard');
        } else if (result.account.accessible_portals?.includes('member')) {
          router.push('/member');
        } else {
          router.push('/auth/waiting-approval');
        }
      } else {
        // Handle regular email/password registration
        const result = await register({
          email: credentials.email,
          password: credentials.password,
          firstName: credentials.firstName,
          lastName: credentials.lastName,
        });

        // If registration was successful, redirect to member portal
        if (result.success) {
          router.push('/member');
        }
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const registerGoogleUser = async (data: {
    email: string;
    firstName: string;
    lastName: string;
    googleData: GoogleUserData;
  }) => {
    // Create account with Google data
    const response = await fetch('/api/auth/register-google', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
        google_id: data.googleData.google_id,
        avatar_url: data.googleData.avatar_url,
        access_token: data.googleData.access_token,
        refresh_token: data.googleData.refresh_token
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Google registration failed');
    }

    return response.json();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-4">
            <Dumbbell className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {isGoogleAuth ? 'Complete Your Registration' : 'Create an Account'}
          </CardTitle>
          <CardDescription>
            {isGoogleAuth ? 'We got your info from Google. Please review and complete your registration.' : 'Join our gym management system'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive" className="border-red-500 bg-red-50 dark:bg-red-950/20">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertDescription className="text-red-800 dark:text-red-200 font-medium">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {isGoogleAuth && googleData && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                <div className="flex items-center space-x-3">
                  {googleData.avatar_url && (
                    <img 
                      src={googleData.avatar_url} 
                      alt="Google Profile" 
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <div>
                    <p className="font-medium">Signed in with Google</p>
                    <p className="text-sm text-green-700 dark:text-green-300">{googleData.email}</p>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  value={credentials.firstName}
                  onChange={(e) => setCredentials(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="John"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  value={credentials.lastName}
                  onChange={(e) => setCredentials(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Doe"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={credentials.email}
                onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter your email"
                required
                disabled={isGoogleAuth}
                className={isGoogleAuth ? "bg-muted" : ""}
              />
              {isGoogleAuth && (
                <p className="text-xs text-muted-foreground">
                  Email from your Google account
                </p>
              )}
            </div>
            {!isGoogleAuth && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={credentials.password}
                  onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Create a password"
                  required
                  minLength={6}
                />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading 
                ? (isGoogleAuth ? "Completing registration..." : "Creating account...") 
                : (isGoogleAuth ? "Complete Registration" : "Create Account")
              }
            </Button>
          </form>

          <div className="text-center text-sm">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}