import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { REQUEST_TYPES, PRIORITIES, DEFAULT_ROUTING, type ServiceRequest } from '@/hooks/useServiceRequests';
import { toast } from '@/hooks/use-toast';

interface Props {
  onSubmit: (data: Partial<ServiceRequest>) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<ServiceRequest>;
}

export function ServiceRequestForm({ onSubmit, onCancel, initialData }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [requestType, setRequestType] = useState(initialData?.request_type || '');
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [priority, setPriority] = useState(initialData?.priority || 'normal');
  const [dueDate, setDueDate] = useState(initialData?.due_date?.split('T')[0] || '');
  const [relatedModule, setRelatedModule] = useState(initialData?.related_module || '');
  const [tags, setTags] = useState(initialData?.tags?.join(', ') || '');
  const [internalNotes, setInternalNotes] = useState(initialData?.internal_notes || '');

  const routing = DEFAULT_ROUTING[requestType];

  const handleSubmit = async () => {
    if (!requestType || !title.trim()) {
      toast({ title: 'Missing fields', description: 'Request type and title are required.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        request_type: requestType,
        title: title.trim(),
        description: description.trim(),
        priority: routing?.priority || priority,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        related_module: relatedModule || null,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        internal_notes: internalNotes.trim(),
        assigned_role: routing?.role || null,
      });
      toast({ title: 'Request created', description: 'Your service request has been submitted.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onCancel} className="gap-1">
        <ArrowLeft className="w-4 h-4" /> Back
      </Button>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">New Service Request</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Request Type *</Label>
              <Select value={requestType} onValueChange={setRequestType}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {REQUEST_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {routing && (
                <p className="text-[10px] text-muted-foreground">
                  Auto-routes to: {routing.role.replace(/_/g, ' ')}
                  {routing.priority ? ` • Priority: ${routing.priority}` : ''}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Brief summary..." className="h-9" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detailed description..." rows={4} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Due Date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Related Module</Label>
              <Select value={relatedModule} onValueChange={setRelatedModule}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="clinical">Clinical</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="scheduling">Scheduling</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="authorizations">Authorizations</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Tags (comma-separated)</Label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. insurance, urgent-review" className="h-9" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Internal Notes</Label>
            <Textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} placeholder="Notes visible only to staff..." rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
