import { useState, useEffect } from 'react';
import { ArrowLeft, Clock, User, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { STATUSES, PRIORITIES, REQUEST_TYPES, type ServiceRequest, type ServiceRequestActivity } from '@/hooks/useServiceRequests';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

interface Props {
  request: ServiceRequest;
  onBack: () => void;
  onUpdate: (updates: Partial<ServiceRequest>) => Promise<void>;
  getActivities: () => Promise<ServiceRequestActivity[]>;
}

export function ServiceRequestDetail({ request, onBack, onUpdate, getActivities }: Props) {
  const [activities, setActivities] = useState<ServiceRequestActivity[]>([]);
  const [newNote, setNewNote] = useState('');
  const [resolution, setResolution] = useState(request.resolution_summary || '');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    getActivities().then(setActivities);
  }, []);

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true);
    try {
      const updates: Partial<ServiceRequest> = { status: newStatus };
      if (newStatus === 'completed') updates.completed_at = new Date().toISOString();
      if (newStatus === 'closed') updates.closed_at = new Date().toISOString();
      if (newStatus === 'escalated') updates.escalated_at = new Date().toISOString();
      await onUpdate(updates);
      toast({ title: 'Status updated' });
      getActivities().then(setActivities);
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveResolution = async () => {
    await onUpdate({ resolution_summary: resolution });
    toast({ title: 'Resolution saved' });
  };

  const getTypeLabel = (type: string) => REQUEST_TYPES.find(t => t.value === type)?.label || type;
  const statusObj = STATUSES.find(s => s.value === request.status);
  const priorityObj = PRIORITIES.find(p => p.value === request.priority);

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
        <ArrowLeft className="w-4 h-4" /> Back to list
      </Button>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">{getTypeLabel(request.request_type)}</p>
              <CardTitle className="text-base">{request.title}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${priorityObj?.color || ''}`}>{priorityObj?.label}</span>
              <Badge variant="secondary" className={`text-[10px] ${statusObj?.color || ''}`}>{statusObj?.label}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {request.description && (
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <p className="text-sm mt-1">{request.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground">Created</span>
              <p>{format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}</p>
            </div>
            {request.due_date && (
              <div>
                <span className="text-muted-foreground">Due</span>
                <p>{format(new Date(request.due_date), 'MMM d, yyyy')}</p>
              </div>
            )}
            {request.assigned_role && (
              <div>
                <span className="text-muted-foreground">Assigned Role</span>
                <p>{request.assigned_role.replace(/_/g, ' ')}</p>
              </div>
            )}
            {request.related_module && (
              <div>
                <span className="text-muted-foreground">Module</span>
                <p className="capitalize">{request.related_module}</p>
              </div>
            )}
          </div>

          {request.tags && request.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {request.tags.map(tag => <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>)}
            </div>
          )}

          {request.internal_notes && (
            <div className="bg-muted/50 rounded-md p-3">
              <Label className="text-xs text-muted-foreground">Internal Notes</Label>
              <p className="text-sm mt-1">{request.internal_notes}</p>
            </div>
          )}

          <Separator />

          {/* Status Update */}
          <div className="space-y-2">
            <Label className="text-xs">Update Status</Label>
            <Select value={request.status} onValueChange={handleStatusChange} disabled={updating}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Resolution */}
          {(request.status === 'completed' || request.status === 'closed') && (
            <div className="space-y-2">
              <Label className="text-xs">Resolution Summary</Label>
              <Textarea value={resolution} onChange={(e) => setResolution(e.target.value)} rows={3} />
              <Button size="sm" onClick={handleSaveResolution}>Save Resolution</Button>
            </div>
          )}

          <Separator />

          {/* Activity Timeline */}
          <div>
            <h4 className="text-xs font-semibold mb-3 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" /> Activity Log
            </h4>
            {activities.length === 0 ? (
              <p className="text-xs text-muted-foreground">No activity yet.</p>
            ) : (
              <div className="space-y-2">
                {activities.map(act => (
                  <div key={act.id} className="flex gap-2 text-xs">
                    <Clock className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p>{act.note_text || act.action}</p>
                      <p className="text-muted-foreground">
                        {format(new Date(act.created_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
