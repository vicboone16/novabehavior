import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useStaffProfile } from '@/hooks/useStaffProfile';
import { useAuth } from '@/contexts/AuthContext';
import { 
  User, Shield, Clock, MapPin, Briefcase, Users, FileText,
  AlertTriangle, CheckCircle
} from 'lucide-react';
import { StaffOverviewTab } from './tabs/StaffOverviewTab';
import { StaffCredentialsTab } from './tabs/StaffCredentialsTab';
import { StaffAvailabilityTab } from './tabs/StaffAvailabilityTab';
import { StaffTravelGeoTab } from './tabs/StaffTravelGeoTab';
import { StaffServiceCapabilitiesTab } from './tabs/StaffServiceCapabilitiesTab';
import { StaffAssignmentsTab } from './tabs/StaffAssignmentsTab';
import { StaffNotesTab } from './tabs/StaffNotesTab';

export function StaffProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const targetUserId = userId || user?.id;
  
  const {
    loading,
    profile,
    availability,
    credentials,
    supervisorLinks,
    superviseeLinks,
    caseloadCount,
    hasActiveSupervisor,
    canBeScheduled,
    refetch,
    updateProfile,
  } = useStaffProfile(targetUserId);

  const [activeTab, setActiveTab] = useState('overview');

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Profile Not Found</h3>
            <p className="text-muted-foreground">The requested staff profile could not be loaded.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isRBTorBT = profile.credential === 'RBT' || profile.credential === 'BT';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {profile.display_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Staff Member'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={profile.employment_status === 'active' ? 'default' : 'secondary'}>
                {profile.employment_status || 'Unknown Status'}
              </Badge>
              {profile.credential && (
                <Badge variant="outline">{profile.credential}</Badge>
              )}
              {profile.role && (
                <Badge variant="outline" className="capitalize">{profile.role}</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isRBTorBT && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
              hasActiveSupervisor ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
            }`}>
              {hasActiveSupervisor ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Supervisor Linked</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">No Active Supervisor</span>
                </>
              )}
            </div>
          )}
          
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
            canBeScheduled ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {canBeScheduled ? (
              <>
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Can Be Scheduled</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Cannot Schedule</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{caseloadCount}</div>
            <p className="text-sm text-muted-foreground">Active Clients</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{availability.length}</div>
            <p className="text-sm text-muted-foreground">Availability Slots</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{credentials.length}</div>
            <p className="text-sm text-muted-foreground">Credentials</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{superviseeLinks.length}</div>
            <p className="text-sm text-muted-foreground">Supervisees</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="credentials" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Credentials
          </TabsTrigger>
          <TabsTrigger value="availability" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Availability
          </TabsTrigger>
          <TabsTrigger value="travel" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Travel & Geo
          </TabsTrigger>
          <TabsTrigger value="services" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Services
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Assignments
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <StaffOverviewTab 
            profile={profile} 
            updateProfile={updateProfile}
            supervisorLinks={supervisorLinks}
            superviseeLinks={superviseeLinks}
          />
        </TabsContent>
        
        <TabsContent value="credentials">
          <StaffCredentialsTab 
            userId={targetUserId!}
            credentials={credentials}
            refetch={refetch}
          />
        </TabsContent>
        
        <TabsContent value="availability">
          <StaffAvailabilityTab 
            userId={targetUserId!}
            availability={availability}
            refetch={refetch}
          />
        </TabsContent>
        
        <TabsContent value="travel">
          <StaffTravelGeoTab 
            profile={profile}
            updateProfile={updateProfile}
          />
        </TabsContent>
        
        <TabsContent value="services">
          <StaffServiceCapabilitiesTab 
            profile={profile}
            updateProfile={updateProfile}
          />
        </TabsContent>
        
        <TabsContent value="assignments">
          <StaffAssignmentsTab 
            userId={targetUserId!}
            caseloadCount={caseloadCount}
            supervisorLinks={supervisorLinks}
            superviseeLinks={superviseeLinks}
            refetch={refetch}
          />
        </TabsContent>
        
        <TabsContent value="notes">
          <StaffNotesTab 
            userId={targetUserId!}
            profile={profile}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
