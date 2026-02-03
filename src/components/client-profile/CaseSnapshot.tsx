import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  Shield, 
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import type { 
  ClientContact, 
  ClientLocation, 
  ClientTeamAssignment, 
  ClientSafetyMedical,
  ClientServiceLine 
} from '@/types/clientProfile';
import { SAFETY_FLAG_OPTIONS } from '@/types/clientProfile';

interface CaseSnapshotProps {
  supervisor?: ClientTeamAssignment & { staff_profile?: { display_name?: string; credential?: string } };
  primaryContact?: ClientContact;
  primaryLocation?: ClientLocation;
  nextSession?: { date: string; time: string; type: string } | null;
  safetyFlags?: string[];
  authorizationStatus?: 'active' | 'expiring' | 'expired' | 'none';
  serviceLines?: ClientServiceLine[];
  onNavigate?: (tab: string) => void;
}

export function CaseSnapshot({
  supervisor,
  primaryContact,
  primaryLocation,
  nextSession,
  safetyFlags = [],
  authorizationStatus = 'none',
  serviceLines = [],
  onNavigate,
}: CaseSnapshotProps) {
  const highSeverityFlags = safetyFlags.filter(f => 
    SAFETY_FLAG_OPTIONS.find(o => o.value === f)?.severity === 'high'
  );

  const getAuthBadge = () => {
    switch (authorizationStatus) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700">Active</Badge>;
      case 'expiring':
        return <Badge className="bg-amber-100 text-amber-700">Expiring Soon</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return <Badge variant="outline">Not Required</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Case Snapshot
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Supervisor */}
        <div 
          className="flex items-center justify-between cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-1 rounded"
          onClick={() => onNavigate?.('team')}
        >
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Primary Supervisor</p>
              {supervisor ? (
                <p className="text-sm text-muted-foreground">
                  {supervisor.staff_profile?.display_name || 'Unknown'}
                  {supervisor.staff_profile?.credential && `, ${supervisor.staff_profile.credential}`}
                </p>
              ) : (
                <p className="text-sm text-destructive">Not assigned</p>
              )}
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Primary Contact */}
        <div 
          className="flex items-center justify-between cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-1 rounded"
          onClick={() => onNavigate?.('contacts')}
        >
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Primary Contact</p>
              {primaryContact ? (
                <p className="text-sm text-muted-foreground">
                  {primaryContact.full_name} ({primaryContact.relationship})
                </p>
              ) : (
                <p className="text-sm text-destructive">Not set</p>
              )}
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Primary Location */}
        <div 
          className="flex items-center justify-between cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-1 rounded"
          onClick={() => onNavigate?.('locations')}
        >
          <div className="flex items-center gap-3">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Primary Location</p>
              {primaryLocation ? (
                <p className="text-sm text-muted-foreground">
                  {primaryLocation.location_name} ({primaryLocation.location_type})
                </p>
              ) : (
                <p className="text-sm text-destructive">Not set</p>
              )}
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Next Session */}
        <div 
          className="flex items-center justify-between cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-1 rounded"
          onClick={() => onNavigate?.('scheduling')}
        >
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Next Session</p>
              {nextSession ? (
                <p className="text-sm text-muted-foreground">
                  {format(new Date(nextSession.date), 'MMM d')} at {nextSession.time}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">None scheduled</p>
              )}
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Authorization Status */}
        <div 
          className="flex items-center justify-between cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-1 rounded"
          onClick={() => onNavigate?.('services')}
        >
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Authorization</p>
              <div className="flex items-center gap-2">
                {getAuthBadge()}
                {serviceLines.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {serviceLines.filter(s => s.is_active).length} active services
                  </span>
                )}
              </div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Safety Flags */}
        {safetyFlags.length > 0 && (
          <div 
            className="flex items-start justify-between cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-1 rounded"
            onClick={() => onNavigate?.('safety')}
          >
            <div className="flex items-start gap-3">
              <Shield className={`h-4 w-4 mt-0.5 ${highSeverityFlags.length > 0 ? 'text-red-500' : 'text-amber-500'}`} />
              <div>
                <p className="text-sm font-medium">Safety Flags</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {safetyFlags.slice(0, 3).map((flag) => {
                    const flagInfo = SAFETY_FLAG_OPTIONS.find(o => o.value === flag);
                    return (
                      <Badge 
                        key={flag} 
                        variant="outline"
                        className={flagInfo?.severity === 'high' ? 'border-red-300 text-red-700' : ''}
                      >
                        {flagInfo?.label || flag}
                      </Badge>
                    );
                  })}
                  {safetyFlags.length > 3 && (
                    <Badge variant="outline">+{safetyFlags.length - 3} more</Badge>
                  )}
                </div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
