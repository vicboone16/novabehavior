import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { X, Plus, AlertTriangle } from 'lucide-react';
import {
  SessionType,
  SESSION_TYPE_LABELS,
  ObservationContext,
  SettingEvent,
  SETTING_EVENT_LABELS,
  SETTING_LABELS,
} from '@/types/behavior';
import { useDataStore } from '@/store/dataStore';

interface SessionSetupModalProps {
  open: boolean;
  onConfirm: () => void;
  onSkip: () => void;
}

const ACTIVITY_SUGGESTIONS = [
  'Circle Time',
  'Independent Work',
  'Small Group Instruction',
  'Transitions',
  'Free Play',
  'Lunch/Snack',
  'DTT/Structured Teaching',
  'Recess',
  'Specials (Art/Music/PE)',
  'Community Outing',
];

const SEVERITY_LABELS: Record<NonNullable<SettingEvent['severity']>, string> = {
  mild: 'Mild',
  moderate: 'Moderate',
  significant: 'Significant',
};

export function SessionSetupModal({ open, onConfirm, onSkip }: SessionSetupModalProps) {
  const { setSessionType, setObservationContext, addSettingEvent, currentSessionType, currentObservationContext } =
    useDataStore();

  const [sessionType, setLocalSessionType] = useState<SessionType>('teaching');
  const [setting, setLocalSetting] = useState<ObservationContext['setting']>(undefined);
  const [settingCustom, setSettingCustom] = useState('');
  const [activity, setActivity] = useState('');
  const [personnel, setPersonnel] = useState('');
  const [personnelList, setPersonnelList] = useState<string[]>([]);

  // Setting events
  const [pendingEventCategory, setPendingEventCategory] = useState<SettingEvent['category']>('sleep');
  const [pendingEventSeverity, setPendingEventSeverity] = useState<SettingEvent['severity']>('mild');
  const [pendingEventNote, setPendingEventNote] = useState('');
  const [settingEvents, setSettingEvents] = useState<Omit<SettingEvent, 'id'>[]>([]);

  const addPersonnel = () => {
    const name = personnel.trim();
    if (!name || personnelList.includes(name)) return;
    setPersonnelList((prev) => [...prev, name]);
    setPersonnel('');
  };

  const addEvent = () => {
    setSettingEvents((prev) => [
      ...prev,
      {
        category: pendingEventCategory,
        severity: pendingEventSeverity,
        description: pendingEventNote || undefined,
        recordedAt: new Date(),
      },
    ]);
    setPendingEventNote('');
  };

  const handleConfirm = () => {
    setSessionType(sessionType);
    setObservationContext({
      setting,
      settingCustom: setting === 'other' ? settingCustom : undefined,
      activity: activity.trim() || undefined,
      personnel: personnelList.length > 0 ? personnelList : undefined,
    });
    settingEvents.forEach((e) => addSettingEvent(e));
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onSkip(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Session Setup</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Configure session type and context before collecting data. This determines which mastery criteria apply.
          </p>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Session Type */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Session Type <span className="text-destructive">*</span></Label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(SESSION_TYPE_LABELS) as SessionType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setLocalSessionType(type)}
                  className={`rounded-md border px-3 py-2 text-sm font-medium transition-all text-left ${
                    sessionType === type
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <div className="font-semibold">{SESSION_TYPE_LABELS[type]}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {type === 'teaching' && 'Instruction with prompts/reinforcement'}
                    {type === 'probe' && 'Independent performance without prompting'}
                    {type === 'maintenance' && 'Monitoring previously mastered skills'}
                    {type === 'baseline' && 'Pre-intervention measurement'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Observation Context */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Observation Context <span className="text-muted-foreground font-normal">(optional)</span></Label>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Setting</Label>
              <Select value={setting ?? ''} onValueChange={(v) => setLocalSetting(v as ObservationContext['setting'])}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select setting…" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(SETTING_LABELS) as [ObservationContext['setting'], string][]).map(([val, label]) => (
                    <SelectItem key={val} value={val!}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {setting === 'other' && (
                <Input
                  className="h-9 text-sm"
                  placeholder="Describe setting…"
                  value={settingCustom}
                  onChange={(e) => setSettingCustom(e.target.value)}
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Activity</Label>
              <datalist id="activity-suggestions">
                {ACTIVITY_SUGGESTIONS.map((a) => <option key={a} value={a} />)}
              </datalist>
              <Input
                className="h-9 text-sm"
                list="activity-suggestions"
                placeholder="e.g. Circle Time, DTT…"
                value={activity}
                onChange={(e) => setActivity(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Personnel present</Label>
              <div className="flex gap-2">
                <Input
                  className="h-9 text-sm"
                  placeholder="Add name and press Enter"
                  value={personnel}
                  onChange={(e) => setPersonnel(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPersonnel(); } }}
                />
                <Button type="button" size="sm" variant="outline" onClick={addPersonnel}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {personnelList.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {personnelList.map((p) => (
                    <Badge key={p} variant="secondary" className="gap-1 text-xs">
                      {p}
                      <button onClick={() => setPersonnelList((prev) => prev.filter((x) => x !== p))}>
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Setting Events */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <Label className="text-sm font-semibold">Setting Events <span className="text-muted-foreground font-normal">(distal antecedents)</span></Label>
            </div>
            <p className="text-xs text-muted-foreground -mt-1">
              Conditions from earlier in the day that may influence behavior (poor sleep, medication change, etc.).
            </p>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Category</Label>
                <Select
                  value={pendingEventCategory}
                  onValueChange={(v) => setPendingEventCategory(v as SettingEvent['category'])}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(SETTING_EVENT_LABELS) as [SettingEvent['category'], string][]).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Severity</Label>
                <Select
                  value={pendingEventSeverity}
                  onValueChange={(v) => setPendingEventSeverity(v as SettingEvent['severity'])}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(SEVERITY_LABELS) as [SettingEvent['severity'], string][]).map(([val, label]) => (
                      <SelectItem key={val!} value={val!}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                className="h-9 text-sm"
                placeholder="Optional note…"
                value={pendingEventNote}
                onChange={(e) => setPendingEventNote(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEvent(); } }}
              />
              <Button type="button" size="sm" variant="outline" onClick={addEvent}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {settingEvents.length > 0 && (
              <div className="space-y-1.5">
                {settingEvents.map((ev, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md border bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-xs">
                    <div>
                      <span className="font-medium">{SETTING_EVENT_LABELS[ev.category]}</span>
                      {ev.severity && <span className="text-muted-foreground ml-2">({SEVERITY_LABELS[ev.severity]})</span>}
                      {ev.description && <span className="text-muted-foreground ml-2">— {ev.description}</span>}
                    </div>
                    <button onClick={() => setSettingEvents((prev) => prev.filter((_, j) => j !== i))}>
                      <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={onSkip} className="text-muted-foreground">
            Skip for now
          </Button>
          <Button onClick={handleConfirm} className="gap-2">
            Start Session
            <Badge variant="secondary" className="ml-1 text-xs font-mono">
              {SESSION_TYPE_LABELS[sessionType]}
            </Badge>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
