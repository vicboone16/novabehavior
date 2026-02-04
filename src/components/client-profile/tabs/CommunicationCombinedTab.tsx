import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Languages, Save, Plus, Trash2, MessageSquare, Phone, Mail, Video, User, Calendar, 
  ArrowUpRight, ArrowDownLeft, Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import type { ClientCommunicationAccess, ClientCommunicationLog, ClientContact } from '@/types/clientProfile';
import { COMMUNICATION_MODES, CONTACT_METHODS, TOPIC_TAGS } from '@/types/clientProfile';
import { useAuth } from '@/contexts/AuthContext';

interface CommunicationCombinedTabProps {
  clientId: string;
  communicationAccess: ClientCommunicationAccess | null;
  communicationLog: ClientCommunicationLog[];
  contacts: ClientContact[];
  onRefresh: () => void;
}

const LANGUAGES = [
  'English', 'Spanish', 'Mandarin', 'Cantonese', 'Vietnamese', 
  'Korean', 'Tagalog', 'Arabic', 'Russian', 'Portuguese', 
  'French', 'Hindi', 'Urdu', 'Japanese', 'Other'
];

export function CommunicationCombinedTab({ 
  clientId, 
  communicationAccess, 
  communicationLog, 
  contacts,
  onRefresh 
}: CommunicationCombinedTabProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('log');
  const [saving, setSaving] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Communication Settings Form
  const [settingsData, setSettingsData] = useState({
    primary_language: communicationAccess?.primary_language || 'English',
    secondary_languages: communicationAccess?.secondary_languages || [],
    preferred_language_for_caregiver_comms: communicationAccess?.preferred_language_for_caregiver_comms || 'English',
    interpreter_required: communicationAccess?.interpreter_required || false,
    interpreter_language: communicationAccess?.interpreter_language || '',
    communication_mode: communicationAccess?.communication_mode || null,
    aac_device_type: communicationAccess?.aac_device_type || '',
    aac_notes: communicationAccess?.aac_notes || '',
    cultural_notes: communicationAccess?.cultural_notes || '',
  });

  // Log Entry Form
  const [logFormData, setLogFormData] = useState({
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

  useEffect(() => {
    if (communicationAccess) {
      setSettingsData({
        primary_language: communicationAccess.primary_language,
        secondary_languages: communicationAccess.secondary_languages || [],
        preferred_language_for_caregiver_comms: communicationAccess.preferred_language_for_caregiver_comms,
        interpreter_required: communicationAccess.interpreter_required,
        interpreter_language: communicationAccess.interpreter_language || '',
        communication_mode: communicationAccess.communication_mode,
        aac_device_type: communicationAccess.aac_device_type || '',
        aac_notes: communicationAccess.aac_notes || '',
        cultural_notes: communicationAccess.cultural_notes || '',
      });
    }
  }, [communicationAccess]);

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      const saveData = { client_id: clientId, ...settingsData };

      if (communicationAccess?.id) {
        const { error } = await supabase
          .from('client_communication_access')
          .update(saveData)
          .eq('id', communicationAccess.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('client_communication_access')
          .insert(saveData);
        if (error) throw error;
      }

      toast.success('Communication settings saved');
      onRefresh();
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleAddLogEntry = async () => {
    if (!logFormData.contact_person || !logFormData.summary) {
      toast.error('Contact person and summary are required');
      return;
    }

    try {
      const { error } = await supabase.from('client_communication_log').insert({
        client_id: clientId,
        contact_person: logFormData.contact_person,
        contact_role: logFormData.contact_role || null,
        method: logFormData.method,
        direction: logFormData.direction,
        topic_tags: logFormData.topic_tags,
        summary: logFormData.summary,
        detailed_notes: logFormData.detailed_notes || null,
        follow_up_required: logFormData.follow_up_required,
        follow_up_date: logFormData.follow_up_date || null,
        logged_by: user?.id || '',
        date_time: new Date().toISOString(),
      });

      if (error) throw error;
      toast.success('Communication logged');
      setIsAddDialogOpen(false);
      setLogFormData({
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
      onRefresh();
    } catch (error) {
      console.error('Error logging communication:', error);
      toast.error('Failed to log communication');
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'phone': return <Phone className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'video_call': return <Video className="h-4 w-4" />;
      case 'in_person': return <User className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="log" className="gap-1">
              <MessageSquare className="w-4 h-4" />
              Communication Log
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>
          {activeTab === 'log' && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Log Communication
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Log Communication</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Contact Person *</Label>
                      <Select
                        value={logFormData.contact_person}
                        onValueChange={(value) => {
                          const contact = contacts.find(c => c.full_name === value);
                          setLogFormData({ 
                            ...logFormData, 
                            contact_person: value,
                            contact_role: contact?.relationship || ''
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {contacts.map((contact) => (
                            <SelectItem key={contact.id} value={contact.full_name}>
                              {contact.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={logFormData.contact_person}
                        onChange={(e) => setLogFormData({ ...logFormData, contact_person: e.target.value })}
                        placeholder="Or type name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Input
                        value={logFormData.contact_role}
                        onChange={(e) => setLogFormData({ ...logFormData, contact_role: e.target.value })}
                        placeholder="e.g., Parent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Method</Label>
                      <Select value={logFormData.method} onValueChange={(v) => setLogFormData({ ...logFormData, method: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CONTACT_METHODS.map((m) => (
                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Direction</Label>
                      <Select value={logFormData.direction} onValueChange={(v) => setLogFormData({ ...logFormData, direction: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="outbound">Outbound</SelectItem>
                          <SelectItem value="inbound">Inbound</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Topics</Label>
                    <div className="flex flex-wrap gap-1">
                      {TOPIC_TAGS.map((tag) => (
                        <Badge
                          key={tag}
                          variant={logFormData.topic_tags.includes(tag) ? 'default' : 'outline'}
                          className="cursor-pointer text-xs"
                          onClick={() => {
                            setLogFormData({
                              ...logFormData,
                              topic_tags: logFormData.topic_tags.includes(tag)
                                ? logFormData.topic_tags.filter(t => t !== tag)
                                : [...logFormData.topic_tags, tag]
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
                      value={logFormData.summary}
                      onChange={(e) => setLogFormData({ ...logFormData, summary: e.target.value })}
                      placeholder="Brief summary..."
                      rows={2}
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={logFormData.follow_up_required}
                        onCheckedChange={(c) => setLogFormData({ ...logFormData, follow_up_required: !!c })}
                      />
                      <Label>Follow-up Required</Label>
                    </div>
                    {logFormData.follow_up_required && (
                      <Input
                        type="date"
                        value={logFormData.follow_up_date}
                        onChange={(e) => setLogFormData({ ...logFormData, follow_up_date: e.target.value })}
                        className="flex-1"
                      />
                    )}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddLogEntry}>Log Entry</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <TabsContent value="log" className="mt-4">
          {communicationLog.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No communications logged yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {communicationLog.map((entry) => (
                <Card key={entry.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        {getMethodIcon(entry.method)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{entry.contact_person}</span>
                            {entry.contact_role && (
                              <span className="text-sm text-muted-foreground">({entry.contact_role})</span>
                            )}
                            {entry.direction === 'outbound' 
                              ? <ArrowUpRight className="h-3 w-3 text-green-500" />
                              : <ArrowDownLeft className="h-3 w-3 text-blue-500" />}
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
                              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                            ))}
                          </div>
                        )}
                        {entry.follow_up_required && (
                          <Badge variant="outline" className="mt-2 text-orange-600 border-orange-600">
                            Follow-up {entry.follow_up_date && `by ${format(new Date(entry.follow_up_date), 'MMM d')}`}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Languages className="h-4 w-4" />
                Language Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Primary Language</Label>
                  <Select 
                    value={settingsData.primary_language} 
                    onValueChange={(v) => setSettingsData({ ...settingsData, primary_language: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Preferred for Caregiver Comms</Label>
                  <Select 
                    value={settingsData.preferred_language_for_caregiver_comms} 
                    onValueChange={(v) => setSettingsData({ ...settingsData, preferred_language_for_caregiver_comms: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={settingsData.interpreter_required}
                  onCheckedChange={(c) => setSettingsData({ ...settingsData, interpreter_required: c })}
                />
                <Label>Interpreter Required</Label>
              </div>

              {settingsData.interpreter_required && (
                <Select 
                  value={settingsData.interpreter_language} 
                  onValueChange={(v) => setSettingsData({ ...settingsData, interpreter_language: v })}
                >
                  <SelectTrigger className="w-48"><SelectValue placeholder="Interpreter language..." /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Communication Mode</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select 
                value={settingsData.communication_mode || ''} 
                onValueChange={(v) => setSettingsData({ ...settingsData, communication_mode: v as any })}
              >
                <SelectTrigger><SelectValue placeholder="Select mode..." /></SelectTrigger>
                <SelectContent>
                  {COMMUNICATION_MODES.map((mode) => (
                    <SelectItem key={mode.value} value={mode.value}>{mode.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(settingsData.communication_mode === 'aac' || settingsData.communication_mode === 'mixed') && (
                <>
                  <Input
                    value={settingsData.aac_device_type}
                    onChange={(e) => setSettingsData({ ...settingsData, aac_device_type: e.target.value })}
                    placeholder="AAC Device Type (e.g., Proloquo2Go)"
                  />
                  <Textarea
                    value={settingsData.aac_notes}
                    onChange={(e) => setSettingsData({ ...settingsData, aac_notes: e.target.value })}
                    placeholder="AAC Notes..."
                    rows={2}
                  />
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cultural Considerations</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={settingsData.cultural_notes}
                onChange={(e) => setSettingsData({ ...settingsData, cultural_notes: e.target.value })}
                placeholder="Important cultural considerations..."
                rows={3}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveSettings} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
