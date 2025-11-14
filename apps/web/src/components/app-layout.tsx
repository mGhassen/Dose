"use client";

import { useAuth } from "@kit/hooks";
import AdminLayout from "@/components/admin-layout";
import ManagerLayout from "@/components/manager-layout";
import UserLayout from "@/components/user-layout";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, isLoading } = useAuth();

  // Show loading state while authentication is being checked
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // If no user is authenticated, redirect to login (handled by auth system)
  if (!user) {
    return null;
  }

  // Determine layout based on user role
  const getUserRole = () => {
    // Check accessiblePortals first for more granular control
    if (user.accessiblePortals?.includes('admin')) {
      return 'admin';
    }
    
    // Fallback to role field
    if (user.role === 'admin' || user.isAdmin) {
      return 'admin';
    }
    
    // Check if user has manager access
    if (user.accessiblePortals?.includes('manager') || user.userType === 'manager') {
      return 'manager';
    }
    
    // Default to user layout for conductors and other roles
    return 'user';
  };

  const userRole = getUserRole();

  // Render appropriate layout based on role
  switch (userRole) {
    case 'admin':
      return <AdminLayout>{children}</AdminLayout>;
    case 'manager':
      return <ManagerLayout>{children}</ManagerLayout>;
    case 'user':
    default:
      return <UserLayout>{children}</UserLayout>;
  }
}