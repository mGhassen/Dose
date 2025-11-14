"use client";

import { Button } from "@smartlogbook/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@smartlogbook/ui/card";
import { Clock, ArrowLeft, RefreshCw, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useToast } from "@smartlogbook/hooks";
import { useAuth } from "@smartlogbook/hooks";

export default function WaitingApprovalPage() {
  const { checkAccountStatus } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string>("pending");
  const { toast } = useToast();

  useEffect(() => {
    // Get email from localStorage
    const emailFromStorage = localStorage.getItem('account_status_email');
    if (emailFromStorage) {
      setEmail(emailFromStorage);
    }
  }, []);

  const handleCheckStatus = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "No email address found. Please try logging in again.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const data = await checkAccountStatus(email);
      
      if (data.success) {
        setStatus(data.status || "archived");
        
        // If user is active, redirect to login
        if (data.status === 'active') {
          toast({
            title: "Account Approved!",
            description: "Your account has been approved. You can now log in.",
          });
          setTimeout(() => {
            window.location.href = '/auth/login';
          }, 2000);
        }
      } else {
        console.error('Failed to check status:', data.error);
      }
    } catch (error) {
      console.error('Failed to check status:', error);
      toast({
        title: "Error",
        description: "Failed to check account status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    // Clean up localStorage
    localStorage.removeItem('pending_email');
    localStorage.removeItem('pending_approval_email');
    localStorage.removeItem('account_status_email');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4 shadow-lg">
            <Clock className="w-6 h-6 text-orange-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-orange-600">
            Account Pending Approval
          </CardTitle>
          <CardDescription className="text-base">
            Your account is waiting for admin approval. You'll be notified once it's approved.
            {email && (
              <span className="block mt-2 text-sm font-mono bg-muted px-2 py-1 rounded">
                {email}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <div className="p-6 rounded-xl border-2 bg-muted/50 border-border">
              <h3 className="font-bold text-lg mb-3 text-foreground">
                What happens next:
              </h3>
              <ol className="text-sm space-y-2 text-left text-muted-foreground">
                <li className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold bg-primary text-primary-foreground">
                    1
                  </span>
                  <span>Admin reviews your account</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold bg-primary text-primary-foreground">
                    2
                  </span>
                  <span>You'll receive an approval notification</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold bg-primary text-primary-foreground">
                    3
                  </span>
                  <span>You can then log in to your account</span>
                </li>
              </ol>
            </div>
            
            <div className="text-sm text-orange-600 bg-orange-100 p-3 rounded-lg border border-orange-200">
              <p>⏰ <strong>Note:</strong> This usually takes 24-48 hours. You can check back periodically to see if your account has been approved.</p>
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handleCheckStatus} 
              disabled={isLoading || !email}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Check Approval Status
                </>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              asChild 
              className="w-full" 
              onClick={handleBackToLogin}
            >
              <Link href="/auth/login">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Link>
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground border-t pt-4">
            <p>Need help? Contact support at <span className="font-mono">support@smartlogbook.com</span></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
