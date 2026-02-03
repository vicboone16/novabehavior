import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  UserPlus, 
  MapPin, 
  Users, 
  Upload, 
  MessageSquarePlus,
  Calendar,
  Phone
} from 'lucide-react';

interface QuickActionsProps {
  onAddContact: () => void;
  onAddLocation: () => void;
  onAssignStaff: () => void;
  onUploadDocument: () => void;
  onLogCommunication: () => void;
}

export function QuickActions({
  onAddContact,
  onAddLocation,
  onAssignStaff,
  onUploadDocument,
  onLogCommunication,
}: QuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={onAddContact}>
        <UserPlus className="h-4 w-4 mr-1" />
        Add Contact
      </Button>
      <Button variant="outline" size="sm" onClick={onAddLocation}>
        <MapPin className="h-4 w-4 mr-1" />
        Add Location
      </Button>
      <Button variant="outline" size="sm" onClick={onAssignStaff}>
        <Users className="h-4 w-4 mr-1" />
        Assign Staff
      </Button>
      <Button variant="outline" size="sm" onClick={onUploadDocument}>
        <Upload className="h-4 w-4 mr-1" />
        Upload Document
      </Button>
      <Button variant="outline" size="sm" onClick={onLogCommunication}>
        <MessageSquarePlus className="h-4 w-4 mr-1" />
        Log Communication
      </Button>
    </div>
  );
}
