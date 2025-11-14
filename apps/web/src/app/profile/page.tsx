"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@kit/hooks";
import { useProfileByUserId } from "@kit/hooks";
import { Button } from "@kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kit/ui/card";
import { Badge } from "@kit/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@kit/ui/avatar";
import { Separator } from "@kit/ui/separator";
import { 
  Edit, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Shield, 
  User, 
  Settings,
  CheckCircle,
  Clock,
  XCircle,
  Building,
  CreditCard,
  Globe,
  Lock,
  Award,
  Languages,
  Briefcase,
  AlertCircle
} from "lucide-react";
import AppLayout from "@/components/app-layout";
import { ProfileEditDialog } from "@/components/profile-edit-dialog";
import { useDateFormat } from "@kit/hooks/use-date-format";

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { formatDate } = useDateFormat();
  const [isEditOpen, setIsEditOpen] = useState(false);
  
  // Convert user.id (string) to number for the hook
  const userId = user?.id ? parseInt(user.id, 10) : undefined;
  
  // Fetch profile data using React Query hook
  const { data: profileData, isLoading: profileLoading, error: profileError } = useProfileByUserId(
    userId || 0
  );
  
  // Calculate statistics from profile data
  const statistics = useMemo(() => {
    if (!profileData) return null;
    
    const totalCertifications = profileData.certifications?.length || 0;
    const activeCertifications = profileData.certifications?.filter(c => c.status === 'active').length || 0;
    const expiredCertifications = profileData.certifications?.filter(c => c.status === 'expired').length || 0;
    const skillsCount = profileData.skills?.length || 0;
    const languagesCount = profileData.languages?.length || 0;
    
    return {
      totalCertifications,
      activeCertifications,
      expiredCertifications,
      skillsCount,
      languagesCount,
      lastUpdated: profileData.updatedAt || profileData.createdAt,
    };
  }, [profileData]);

  if (authLoading || (userId && profileLoading)) {
    return (
      <AppLayout>
        <div className="container py-6">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
                <h3 className="text-lg font-semibold mb-2">Loading...</h3>
                <p className="text-muted-foreground">Please wait while we load your profile.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return (
      <AppLayout>
        <div className="container py-6">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No User Data</h3>
                <p className="text-muted-foreground">Please log in to view your profile.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'inactive':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'inactive':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'manager':
        return 'bg-primary text-primary-foreground';
      case 'operator':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'viewer':
        return 'bg-secondary text-secondary-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <AppLayout>
      <div className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profileData?.avatar || "/avatars/user.jpg"} alt={profileData?.firstName || user?.firstName || "User"} />
              <AvatarFallback className="text-lg">
                {(profileData?.firstName || user?.firstName)?.charAt(0) || user?.email?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">
                {profileData?.firstName && profileData?.lastName
                  ? `${profileData.firstName} ${profileData.lastName}` 
                  : user?.email?.split('@')[0] || 'User'
                }
              </h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                {profileData?.id && (
                  <Badge variant="secondary" className="text-sm font-mono">
                    #{profileData.id}
                  </Badge>
                )}
                {profileData?.createdAt && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Created:</span>
                    <span>{formatDate(profileData.createdAt)}</span>
                  </div>
                )}
                {profileData?.updatedAt && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Updated:</span>
                    <span>{formatDate(profileData.updatedAt)}</span>
                  </div>
                )}
              </div>
              {profileData?.position && (
                <p className="text-muted-foreground">
                  {profileData.position}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={() => setIsEditOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        </div>

        {/* Profile Data Status */}
        {profileError && (
          <Card className="mb-6 border-amber-500">
            <CardContent className="py-4">
              <div className="flex items-center space-x-2 text-amber-600">
                <AlertCircle className="h-4 w-4" />
                <p className="text-sm">
                  Extended profile information not available. Showing basic user information.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statistics Overview */}
        {statistics && (
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Certifications</p>
                    <p className="text-2xl font-bold">{statistics.totalCertifications}</p>
                  </div>
                  <Award className="h-8 w-8 text-primary opacity-50" />
                </div>
                <div className="mt-2 flex gap-2 text-xs">
                  <span className="text-green-600">{statistics.activeCertifications} active</span>
                  {statistics.expiredCertifications > 0 && (
                    <span className="text-red-600">{statistics.expiredCertifications} expired</span>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Skills</p>
                    <p className="text-2xl font-bold">{statistics.skillsCount}</p>
                  </div>
                  <Briefcase className="h-8 w-8 text-primary opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Languages</p>
                    <p className="text-2xl font-bold">{statistics.languagesCount}</p>
                  </div>
                  <Languages className="h-8 w-8 text-primary opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                    <p className="text-sm font-bold">{formatDate(statistics.lastUpdated)}</p>
                  </div>
                  <Clock className="h-8 w-8 text-primary opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Your personal details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                {(profileData?.email || user?.email) && (
                  <div className="flex items-center space-x-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{profileData?.email || user?.email}</p>
                    </div>
                  </div>
                )}
                
                {profileData?.phone && (
                  <div className="flex items-center space-x-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Phone</p>
                      <p className="text-sm text-muted-foreground">{profileData.phone}</p>
                    </div>
                  </div>
                )}

                {profileData?.address && (
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Address</p>
                      <p className="text-sm text-muted-foreground">
                        {profileData.address.street}, {profileData.address.city} {profileData.address.postalCode}, {profileData.address.country}
                      </p>
                    </div>
                  </div>
                )}

                {profileData?.department && (
                  <div className="flex items-center space-x-3">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Department</p>
                      <p className="text-sm text-muted-foreground">{profileData.department}</p>
                    </div>
                  </div>
                )}

                {profileData?.employeeId && (
                  <div className="flex items-center space-x-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Employee ID</p>
                      <p className="text-sm text-muted-foreground">{profileData.employeeId}</p>
                    </div>
                  </div>
                )}

                {profileData?.hireDate && (
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Hire Date</p>
                      <p className="text-sm text-muted-foreground">{formatDate(profileData.hireDate)}</p>
                    </div>
                  </div>
                )}
                
                {profileData?.emergencyContact && (
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Emergency Contact</p>
                      <p className="text-sm text-muted-foreground">
                        {profileData.emergencyContact.name} ({profileData.emergencyContact.relationship})
                      </p>
                      {profileData.emergencyContact.phone && (
                        <p className="text-xs text-muted-foreground">{profileData.emergencyContact.phone}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Account Information
              </CardTitle>
              <CardDescription>
                Your account status and permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                {user?.role && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Role</p>
                        <Badge className={getRoleColor(user.role)}>
                          {user.role}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}

                {user?.status && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(user.status)}
                      <div>
                        <p className="text-sm font-medium">Status</p>
                        <Badge className={getStatusColor(user.status)}>
                          {user.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}

                {user?.userType && (
                  <div className="flex items-center space-x-3">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">User Type</p>
                      <p className="text-sm text-muted-foreground">{user.userType}</p>
                    </div>
                  </div>
                )}

                {user?.provider && (
                  <div className="flex items-center space-x-3">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Authentication Provider</p>
                      <p className="text-sm text-muted-foreground">{user.provider}</p>
                    </div>
                  </div>
                )}

                {user?.credit !== undefined && (
                  <div className="flex items-center space-x-3">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Credits</p>
                      <p className="text-sm text-muted-foreground">{user?.credit}</p>
                    </div>
                  </div>
                )}

                {user?.member_id && (
                  <div className="flex items-center space-x-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Member ID</p>
                      <p className="text-sm text-muted-foreground">{user?.member_id}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Profile Information */}
          {profileData && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Additional profile details and information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {profileData.bio && (
                    <div>
                      <p className="text-sm font-medium mb-2">Bio</p>
                      <p className="text-sm text-muted-foreground">{profileData.bio}</p>
                    </div>
                  )}
                  
                  {profileData.skills && profileData.skills.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {profileData.skills.map((skill, index) => (
                          <Badge key={index} variant="outline">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {profileData.languages && profileData.languages.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Languages</p>
                      <div className="flex flex-wrap gap-2">
                        {profileData.languages.map((language, index) => (
                          <Badge key={index} variant="secondary">
                            {language}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {profileData.certifications && profileData.certifications.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Certifications</p>
                      <div className="space-y-2">
                        {profileData.certifications.map((cert, index) => {
                          const issueDate = formatDate(cert.issueDate);
                          const expiryDate = cert.expiryDate ? formatDate(cert.expiryDate) : 'N/A';
                          const isExpired = cert.status === 'expired';
                          const isPending = cert.status === 'pending';
                          
                          return (
                            <div key={index} className={`flex items-center justify-between p-3 border rounded-lg ${isExpired ? 'bg-red-50 dark:bg-red-950/20' : isPending ? 'bg-yellow-50 dark:bg-yellow-950/20' : 'bg-green-50 dark:bg-green-950/20'}`}>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-sm font-medium">{cert.name}</p>
                                  <Badge 
                                    variant={cert.status === 'active' ? 'default' : cert.status === 'expired' ? 'destructive' : 'secondary'}
                                    className="text-xs"
                                  >
                                    {cert.status}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mb-1">{cert.issuer}</p>
                                <div className="flex gap-3 text-xs text-muted-foreground">
                                  <span>Issued: {issueDate}</span>
                                  {cert.expiryDate && (
                                    <>
                                      <span>•</span>
                                      <span className={isExpired ? 'text-red-600 font-medium' : ''}>
                                        Expires: {expiryDate}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Access Information */}
          {user?.accessiblePortals && user?.accessiblePortals.length > 0 && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Access & Permissions
                </CardTitle>
                <CardDescription>
                  Your accessible portals and permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Accessible Portals</p>
                    <div className="flex flex-wrap gap-2">
                      {user?.accessiblePortals.map((portal, index) => (
                        <Badge key={index} variant="outline">
                          {portal}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid gap-2">
                    {user?.isAdmin !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Administrator Access</span>
                        <Badge variant={user.isAdmin ? "default" : "secondary"}>
                          {user.isAdmin ? "Yes" : "No"}
                        </Badge>
                      </div>
                    )}
                    {user?.isMember !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Member Status</span>
                        <Badge variant={user.isMember ? "default" : "secondary"}>
                          {user.isMember ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ProfileEditDialog 
        open={isEditOpen} 
        onOpenChange={setIsEditOpen}
        user={user}
      />
    </AppLayout>
  );
}
