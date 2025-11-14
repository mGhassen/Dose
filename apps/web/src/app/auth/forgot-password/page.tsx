"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@kit/hooks/use-auth';
import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import { Alert, AlertDescription } from '@kit/ui/alert';
import { useToast } from '@kit/hooks/use-toast';
import { AlertCircle, CheckCircle, Loader2, ArrowLeft, Clock } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { forgotPassword } = useAuth();
  
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [cooldownEndTime, setCooldownEndTime] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Calculate cooldown duration based on attempt count
  const getCooldownDuration = (attempts: number): number => {
    if (attempts === 1) return 60; // 1 minute
    if (attempts === 2) return 180; // 3 minutes
    return 300; // 5 minutes for 3+ attempts
  };

  // Check if user is in cooldown
  const isInCooldown = cooldownEndTime && Date.now() < cooldownEndTime;

  // Update countdown timer
  useEffect(() => {
    if (!isInCooldown) {
      setTimeRemaining(0);
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, cooldownEndTime! - Date.now());
      setTimeRemaining(remaining);
      
      if (remaining === 0) {
        setCooldownEndTime(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isInCooldown, cooldownEndTime]);

  // Format time remaining
  const formatTimeRemaining = (ms: number): string => {
    const seconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${seconds}s`;
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!email) {
      setError('Please enter your email address');
      setIsLoading(false);
      return;
    }

    try {
      // Use our custom API endpoint for better control
      await forgotPassword(email);

      // Increment attempt count and set cooldown
      const newAttemptCount = attemptCount + 1;
      setAttemptCount(newAttemptCount);
      
      const cooldownDuration = getCooldownDuration(newAttemptCount);
      const endTime = Date.now() + (cooldownDuration * 1000);
      setCooldownEndTime(endTime);

      setSuccess(true);
      
      toast({
        title: "Reset email sent!",
        description: "Check your email for password reset instructions.",
      });

    } catch (err: any) {
      console.error('Forgot password error:', err);
      setError(err.message || 'Failed to send reset email');
      
      toast({
        title: "Error",
        description: err.message || 'Failed to send reset email',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendAnotherEmail = async () => {
    if (isInCooldown) return;
    
    setIsLoading(true);
    setError('');

    try {
      // Use our custom API endpoint for better control
      await forgotPassword(email);

      // Increment attempt count and set cooldown
      const newAttemptCount = attemptCount + 1;
      setAttemptCount(newAttemptCount);
      
      const cooldownDuration = getCooldownDuration(newAttemptCount);
      const endTime = Date.now() + (cooldownDuration * 1000);
      setCooldownEndTime(endTime);

      toast({
        title: "Email sent again!",
        description: "Check your email for password reset instructions.",
      });

    } catch (err: any) {
      console.error('Send another email error:', err);
      setError(err.message || 'Failed to send reset email');
      
      toast({
        title: "Error",
        description: err.message || 'Failed to send reset email',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle>Check Your Email</CardTitle>
            <CardDescription>
              We've sent password reset instructions to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground text-center">
              <p>Didn't receive the email? Check your spam folder or try again.</p>
            </div>
            
            <div className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleSendAnotherEmail}
                disabled={isInCooldown || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : isInCooldown ? (
                  <>
                    <Clock className="w-4 h-4 mr-2" />
                    Wait {formatTimeRemaining(timeRemaining)}
                  </>
                ) : (
                  'Send Another Email'
                )}
              </Button>
              
              <Button 
                variant="ghost" 
                className="w-full"
                onClick={() => router.push('/auth/login')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            </div>

            {isInCooldown && (
              <div className="text-xs text-muted-foreground text-center">
                <p>Please wait before requesting another email to prevent spam.</p>
                <p>Attempt {attemptCount}: {getCooldownDuration(attemptCount)}s cooldown</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            Forgot Your Password?
          </CardTitle>
          <CardDescription>
            Enter your email address and we'll send you a link to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive" className="border-red-500 bg-red-50 dark:bg-red-950/20">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertDescription className="text-red-800 dark:text-red-200 font-medium">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleRequestReset} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending Reset Email...
                </>
              ) : (
                'Send Reset Email'
              )}
            </Button>
          </form>

          <div className="text-center">
            <Button 
              variant="ghost" 
              className="w-full"
              onClick={() => router.push('/auth/login')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
          </div>

          <div className="text-sm text-muted-foreground text-center">
            <p>
              Remember your password?{" "}
              <Link href="/auth/login" className="text-primary hover:underline">
                Sign in here
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 