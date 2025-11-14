"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@smartlogbook/ui/card';
import { Loader2 } from 'lucide-react';

export default function OAuthSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    // Mock: Simulate OAuth success and redirect to dashboard
    const timer = setTimeout(() => {
      router.push('/dashboard');
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-green-600">Authentication Successful!</CardTitle>
          <CardDescription>
            You have been successfully authenticated. Redirecting to dashboard...
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-green-600" />
        </CardContent>
      </Card>
    </div>
  );
}
