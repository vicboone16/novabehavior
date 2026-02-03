import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { User, Users, MoreVertical, Calendar, Edit, Trash2, Eye, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StaffMember {
  id: string;
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  credential: string | null;
  npi: string | null;
  title: string | null;
  status: string;
  supervisor_id: string | null;
  supervisor_name?: string | null;
  avatar_url: string | null;
  patient_count: number;
  clinician_count?: number;
  roles: string[];
}

interface StaffCardProps {
  staff: StaffMember;
  onViewDetails: (staff: StaffMember) => void;
  onEdit?: (staff: StaffMember) => void;
  onViewSchedule?: (staff: StaffMember) => void;
  onViewPatients?: (staff: StaffMember) => void;
  onDelete?: (staff: StaffMember) => void;
  isSelected?: boolean;
  showPatientCount?: boolean;
  showClinicianCount?: boolean;
}

export function StaffCard({
  staff,
  onViewDetails,
  onEdit,
  onViewSchedule,
  onViewPatients,
  onDelete,
  isSelected,
  showPatientCount = true,
  showClinicianCount = false,
}: StaffCardProps) {
  const initials = staff.first_name && staff.last_name
    ? `${staff.first_name[0]}${staff.last_name[0]}`
    : staff.display_name?.slice(0, 2).toUpperCase() || 'U';

  const fullName = staff.first_name && staff.last_name
    ? `${staff.first_name} ${staff.last_name}`
    : staff.display_name || 'Unknown User';

  const getRoleBadge = () => {
    if (staff.roles.includes('super_admin')) return { label: 'Super Admin', className: 'bg-destructive/10 text-destructive' };
    if (staff.roles.includes('admin')) return { label: 'Admin', className: 'bg-orange-500/10 text-orange-600' };
    if (staff.roles.includes('staff')) return { label: 'Staff', className: 'bg-primary/10 text-primary' };
    return { label: 'Viewer', className: 'bg-muted text-muted-foreground' };
  };

  const roleBadge = getRoleBadge();

  return (
    <Card 
      className={cn(
        "group transition-all hover:shadow-md cursor-pointer relative",
        isSelected && "ring-2 ring-primary shadow-md"
      )}
    >
      <CardContent className="p-4">
        {/* Status badge */}
        <Badge 
          variant="outline" 
          className={cn(
            "absolute top-3 right-3 text-xs",
            staff.status === 'active' 
              ? "bg-green-500/10 text-green-600 border-green-500/20" 
              : "bg-muted text-muted-foreground"
          )}
        >
          {staff.status === 'active' ? 'Active' : 'Inactive'}
        </Badge>

        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12 border-2 border-background shadow">
            <AvatarImage src={staff.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{fullName}</h3>
            {staff.credential && (
              <p className="text-sm text-muted-foreground">{staff.credential}</p>
            )}
            
            {/* Counts */}
            <div className="flex items-center gap-3 mt-1 text-sm">
              {showClinicianCount && staff.clinician_count !== undefined && (
                <span className="text-primary font-medium flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  Clinicians: <span className="font-bold">{staff.clinician_count}</span>
                </span>
              )}
              {showPatientCount && (
                <span className="text-primary font-medium flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  {showClinicianCount ? 'Patients' : 'Clients'}: <span className="font-bold">{staff.patient_count}</span>
                </span>
              )}
            </div>

            {/* Supervisor link */}
            {staff.supervisor_name && (
              <p className="text-xs text-muted-foreground mt-1">
                Supervisor: <span className="text-primary">{staff.supervisor_name}</span>
              </p>
            )}
          </div>
        </div>

        {/* Details row */}
        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t text-xs text-muted-foreground">
          <div>
            <span className="block text-[10px] uppercase tracking-wider mb-0.5">Title</span>
            <span className="text-foreground font-medium">{staff.title || 'Staff'}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-wider mb-0.5">Role</span>
            <Badge variant="outline" className={cn("text-xs px-2 py-0", roleBadge.className)}>
              {roleBadge.label}
            </Badge>
          </div>
        </div>

        {/* Action button */}
        <div className="mt-4 flex gap-2">
          <Button 
            variant={isSelected ? "default" : "outline"} 
            className="flex-1"
            onClick={() => onViewDetails(staff)}
          >
            View Details
          </Button>
          
          {(onEdit || onViewSchedule || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onViewPatients && (
                  <DropdownMenuItem onClick={() => onViewPatients(staff)}>
                    <Users className="w-4 h-4 mr-2" />
                    View Patients
                  </DropdownMenuItem>
                )}
                {onViewSchedule && (
                  <DropdownMenuItem onClick={() => onViewSchedule(staff)}>
                    <Calendar className="w-4 h-4 mr-2" />
                    View Schedule
                  </DropdownMenuItem>
                )}
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(staff)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onDelete(staff)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
