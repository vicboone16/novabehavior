import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, MessageSquare, Phone, Mail, Video, User, Calendar, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { ClientCommunicationLog, ClientContact } from '@/types/clientProfile';
import { CONTACT_METHODS, TOPIC_TAGS } from '@/types/clientProfile';
import { useAuth } from '@/contexts/AuthContext';

interface CommunicationLogTabProps {
  clientId: string;
  communicationLog: ClientCommunicationLog[];
  contacts: ClientContact[];
  onRefetch: () => void;
}

export function CommunicationLogTab({ clientId, communicationLog, contacts, onRefetch }: CommunicationLogTabProps) {
  const { user } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    contact_person: '',
    contact_role: '',
    method: 'phone',
    direction: 'outbound',
    topic_tags: [] as string[],
    summary: '',
    detailed_notes: '',
    follow_up_required: false,
    follow_up_date: '',
  });

  const handleAddEntry = async () => {
    if (!formData.contact_person || !formData.summary) {
      toast.error('Contact person and summary are required');
      return;
    }

    try {
      const { error } = await supabase.from('client_communication_log').insert({
        client_id: clientId,
        contact_person: formData.contact_person,
        contact_role: formData.contact_role || null,
        method: formData.method,
        direction: formData.direction,
        topic_tags: formData.topic_tags,
        summary: formData.summary,
        detailed_notes: formData.detailed_notes || null,
        follow_up_required: formData.follow_up_required,
        follow_up_date: formData.follow_up_date || null,
        logged_by: user?.id || '',
        date_time: new Date().toISOString(),
      });

      if (error) throw error;
      toast.success('Communication logged');
      setIsAddDialogOpen(false);
      setFormData({
        contact_person: '',
        contact_role: '',
        method: 'phone',
        direction: 'outbound',
        topic_tags: [],
        summary: '',
        detailed_notes: '',
        follow_up_required: false,
        follow_up_date: '',
      });
      onRefetch();
    } catch (error) {
      console.error('Error logging communication:', error);
      toast.error('Failed to log communication');
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'phone':
        return <Phone className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'video_call':
        return <Video className="h-4 w-4" />;
      case 'in_person':
        return <User className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getDirectionIcon = (direction: string) => {
    return direction === 'outbound' 
      ? <ArrowUpRight className="h-3 w-3 text-green-500" />
      : <ArrowDownLeft className="h-3 w-3 text-blue-500" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Communication Log</h3>
          <p className="text-sm text-muted-foreground">
            Track all communications with caregivers, schools, and providers
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Log Communication
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Log Communication</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Person *</Label>
                  <Select
                    value={formData.contact_person}
                    onValueChange={(value) => {
                      const contact = contacts.find(c => c.full_name === value);
                      setFormData({ 
                        ...formData, 
                        contact_person: value,
                        contact_role: contact?.relationship || ''
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select or type name" />
                    </SelectTrigger>
                    <SelectContent>
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.full_name}>
                          {contact.full_name} ({contact.relationship})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    placeholder="Or type name directly"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role/Relationship</Label>
                  <Input
                    value={formData.contact_role}
                    onChange={(e) => setFormData({ ...formData, contact_role: e.target.value })}
                    placeholder="e.g., Parent, Teacher"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Method</Label>
                  <Select
                    value={formData.method}
                    onValueChange={(value) => setFormData({ ...formData, method: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTACT_METHODS.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Direction</Label>
                  <Select
                    value={formData.direction}
                    onValueChange={(value) => setFormData({ ...formData, direction: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outbound">Outbound (We contacted them)</SelectItem>
                      <SelectItem value="inbound">Inbound (They contacted us)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Topics</Label>
                <div className="flex flex-wrap gap-2">
                  {TOPIC_TAGS.map((tag) => (
                    <Badge
                      key={tag}
                      variant={formData.topic_tags.includes(tag) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          topic_tags: formData.topic_tags.includes(tag)
                            ? formData.topic_tags.filter(t => t !== tag)
                            : [...formData.topic_tags, tag]
                        });
                      }}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Summary *</Label>
                <Textarea
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  placeholder="Brief summary of the communication..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Detailed Notes</Label>
                <Textarea
                  value={formData.detailed_notes}
                  onChange={(e) => setFormData({ ...formData, detailed_notes: e.target.value })}
                  placeholder="Additional details (optional)..."
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="follow_up"
                    checked={formData.follow_up_required}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, follow_up_required: !!checked })
                    }
                  />
                  <Label htmlFor="follow_up">Follow-up Required</Label>
                </div>
                {formData.follow_up_required && (
                  <div className="flex-1">
                    <Input
                      type="date"
                      value={formData.follow_up_date}
                      onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddEntry}>Log Entry</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Communication Timeline */}
      {communicationLog.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No communications logged yet. Click "Log Communication" to add an entry.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {communicationLog.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {getMethodIcon(entry.method)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{entry.contact_person}</span>
                        {entry.contact_role && (
                          <span className="text-sm text-muted-foreground">({entry.contact_role})</span>
                        )}
                        {getDirectionIcon(entry.direction)}
                      </div>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(entry.date_time), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    <p className="mt-1 text-sm">{entry.summary}</p>
                    {entry.topic_tags && entry.topic_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {entry.topic_tags.map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {entry.follow_up_required && (
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="outline" className="text-orange-600 border-orange-600">
                          Follow-up Required
                        </Badge>
                        {entry.follow_up_date && (
                          <span className="text-xs text-muted-foreground">
                            Due: {format(new Date(entry.follow_up_date), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
