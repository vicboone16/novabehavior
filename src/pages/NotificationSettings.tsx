import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Clock, Plus, RefreshCw, Shield, Volume2, VolumeX } from 'lucide-react';
import { NotificationOrchestratorPanel } from '@/components/phase4';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { useReminderSchedules, formatDays, computeNextFireTime } from '@/hooks/useReminderSchedules';
import { useToast } from '@/hooks/use-toast';

const PREF_ITEMS = [
  { key: 'data_log_reminders' as const, label: 'Data Log Reminder', desc: 'Periodic reminders to log session data' },
  { key: 'escalation_alerts' as const, label: 'Escalation Alert', desc: 'Behavior escalation notifications' },
  { key: 'session_note_reminders' as const, label: 'Session Note Reminder', desc: 'Reminders to complete session notes' },
  { key: 'caregiver_messages' as const, label: 'Caregiver Message Alert', desc: 'New caregiver/parent messages' },
  { key: 'supervision_reminders' as const, label: 'Supervision Reminder', desc: 'Upcoming supervision sessions' },
  { key: 'admin_alerts' as const, label: 'Admin Alert', desc: 'Administrative notifications' },
];

export default function NotificationSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { prefs, loading: prefsLoading, update } = useNotificationPreferences();
  const { schedules, loading: schedLoading, getOverride, upsertOverride, createUserSchedule, reload } = useReminderSchedules();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create form state
  const [newName, setNewName] = useState('');
  const [newKey, setNewKey] = useState('data_log_reminder');
  const [newType, setNewType] = useState('interval');
  const [newStart, setNewStart] = useState('09:00');
  const [newEnd, setNewEnd] = useState('15:00');
  const [newInterval, setNewInterval] = useState(20);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newDays, setNewDays] = useState([1, 2, 3, 4, 5]);

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }
    setCreating(true);
    const ok = await createUserSchedule({
      name: newName,
      reminder_key: newKey,
      reminder_type: newType,
      start_time: newStart + ':00',
      end_time: newEnd + ':00',
      days_of_week: newDays,
      interval_minutes: newInterval,
      message_title: newTitle || newName,
      message_body: newBody || 'Tap to open.',
    });
    if (ok) {
      setShowCreateForm(false);
      setNewName('');
    }
    setCreating(false);
  };

  const toggleDay = (day: number) => {
    setNewDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort());
  };

  const loading = prefsLoading || schedLoading;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold">Notification Settings</h1>
          <p className="text-xs text-muted-foreground">Manage reminders & alerts</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Master Toggles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4" /> Global Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Push Notifications</Label>
                <p className="text-xs text-muted-foreground">Receive remote push alerts</p>
              </div>
              <Switch checked={prefs.push_enabled} onCheckedChange={v => update({ push_enabled: v })} disabled={loading} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Local Reminders</Label>
                <p className="text-xs text-muted-foreground">In-app reminder notifications</p>
              </div>
              <Switch checked={prefs.local_reminders_enabled} onCheckedChange={v => update({ local_reminders_enabled: v })} disabled={loading} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {prefs.quiet_hours_enabled ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                <div>
                  <Label>Quiet Hours</Label>
                  <p className="text-xs text-muted-foreground">
                    {prefs.quiet_hours_enabled
                      ? `${prefs.quiet_hours_start?.slice(0,5)} – ${prefs.quiet_hours_end?.slice(0,5)}`
                      : 'Disabled'}
                  </p>
                </div>
              </div>
              <Switch checked={prefs.quiet_hours_enabled} onCheckedChange={v => update({ quiet_hours_enabled: v })} disabled={loading} />
            </div>
          </CardContent>
        </Card>

        {/* Notification Type Toggles */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notification Types</CardTitle>
            <CardDescription>Toggle individual notification categories</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {PREF_ITEMS.map(item => (
              <div key={item.key} className="flex items-center justify-between py-1">
                <div>
                  <Label className="text-sm">{item.label}</Label>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch
                  checked={(prefs as any)[item.key] ?? true}
                  onCheckedChange={v => update({ [item.key]: v })}
                  disabled={loading}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Reminder Schedules */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" /> Reminder Schedules
              </CardTitle>
              <CardDescription>{schedules.length} schedule(s) configured</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={reload} disabled={loading}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-1" /> New
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {schedules.map(sched => {
              const override = getOverride(sched.id);
              return (
                <div key={sched.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{sched.name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {sched.scope_type}
                      </Badge>
                      {sched.scope_type === 'user' && (
                        <Badge variant="secondary" className="text-[10px]">Custom</Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <div>Key: {sched.reminder_key} · Type: {sched.reminder_type}</div>
                    <div>Window: {sched.start_time?.slice(0,5)} – {sched.end_time?.slice(0,5)} · {formatDays(sched.days_of_week)}</div>
                    {sched.interval_minutes > 0 && <div>Every {sched.interval_minutes} min</div>}
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3" />
                      <span>Next: {computeNextFireTime(sched)}</span>
                    </div>
                  </div>

                  {/* Override controls */}
                  {sched.allow_user_override && (
                    <div className="border-t pt-2 mt-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs flex items-center gap-1">
                          <Shield className="h-3 w-3" /> Override
                        </Label>
                        <Switch
                          checked={override?.override_enabled ?? false}
                          onCheckedChange={v => upsertOverride(sched.id, { override_enabled: v })}
                        />
                      </div>
                      {override?.override_enabled && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[10px]">Interval (min)</Label>
                            <Input
                              type="number"
                              className="h-7 text-xs"
                              value={override.custom_interval_minutes ?? sched.interval_minutes}
                              onChange={e => upsertOverride(sched.id, { custom_interval_minutes: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                          <div>
                            <Label className="text-[10px]">Enabled</Label>
                            <Switch
                              checked={override.notifications_enabled}
                              onCheckedChange={v => upsertOverride(sched.id, { notifications_enabled: v })}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {schedules.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground text-center py-4">No schedules found</p>
            )}
          </CardContent>
        </Card>

        {/* Create Schedule Form */}
        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Create Custom Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Name</Label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="My Custom Reminder" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Reminder Key</Label>
                  <Select value={newKey} onValueChange={setNewKey}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="data_log_reminder">Data Log</SelectItem>
                      <SelectItem value="session_note_reminder">Session Note</SelectItem>
                      <SelectItem value="escalation_alert">Escalation</SelectItem>
                      <SelectItem value="caregiver_message">Caregiver Msg</SelectItem>
                      <SelectItem value="supervision_reminder">Supervision</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select value={newType} onValueChange={setNewType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="interval">Interval</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Start</Label>
                  <Input type="time" value={newStart} onChange={e => setNewStart(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">End</Label>
                  <Input type="time" value={newEnd} onChange={e => setNewEnd(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Interval (min)</Label>
                  <Input type="number" value={newInterval} onChange={e => setNewInterval(parseInt(e.target.value) || 0)} />
                </div>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Days</Label>
                <div className="flex gap-1">
                  {[1,2,3,4,5,6,7].map(d => (
                    <Button
                      key={d}
                      variant={newDays.includes(d) ? 'default' : 'outline'}
                      size="sm"
                      className="h-7 w-9 text-xs px-0"
                      onClick={() => toggleDay(d)}
                    >
                      {['','M','T','W','T','F','S','S'][d]}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs">Title</Label>
                <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Notification title" />
              </div>
              <div>
                <Label className="text-xs">Body</Label>
                <Input value={newBody} onChange={e => setNewBody(e.target.value)} placeholder="Notification body" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleCreate} disabled={creating} className="flex-1">
                  {creating ? 'Creating…' : 'Create Schedule'}
                </Button>
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notification Orchestrator */}
        <Separator className="my-6" />
        <NotificationOrchestratorPanel />
      </div>
    </div>
  );
}
