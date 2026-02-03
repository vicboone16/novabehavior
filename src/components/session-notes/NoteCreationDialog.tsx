import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { FileText, Plus, Clock, MapPin, Database, ArrowRight, CheckCircle2, DollarSign, Link2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useDataStore } from '@/store/dataStore';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionNotes } from '@/hooks/useSessionNotes';
import { NoteTemplate, SessionNoteType, ServiceSetting, AuthorRole, PulledDataSnapshot, NOTE_TYPE_LABELS, SERVICE_SETTING_LABELS, AUTHOR_ROLE_OPTIONS, NOTE_TYPE_DEFAULT_BILLABLE } from '@/types/sessionNotes';

interface NoteCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  templates: NoteTemplate[];
  onNoteCreated: () => void;
}

type Step = 'type' | 'billable' | 'session' | 'data';

export function NoteCreationDialog({ open, onOpenChange, studentId, studentName, templates, onNoteCreated }: NoteCreationDialogProps) {
  const { user, profile, userRole } = useAuth();
  const { createNote } = useSessionNotes(studentId);
  const { sessions, students } = useDataStore();
  
  const [step, setStep] = useState<Step>('type');
  const [creating, setCreating] = useState(false);
  
  // Type selection
  const [noteType, setNoteType] = useState<SessionNoteType>('therapist');
  const [authorRole, setAuthorRole] = useState<AuthorRole>('RBT');
  
  // Billable toggle
  const [isBillable, setIsBillable] = useState(true);
  
  // Session linking
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [manualSession, setManualSession] = useState(false);
  const [sessionDate, setSessionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState(format(new Date(), 'HH:mm'));
  const [endTime, setEndTime] = useState('');
  const [serviceSetting, setServiceSetting] = useState<ServiceSetting>('school');
  const [locationDetail, setLocationDetail] = useState('');
  
  // Data pull
  const [autoPullEnabled, setAutoPullEnabled] = useState(true);
  
  const student = students.find(s => s.id === studentId);
  const studentSessions = sessions.filter(s => s.studentIds?.includes(studentId)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  useEffect(() => {
    if (open) {
      setStep('type');
      setNoteType('therapist');
      setIsBillable(true);
      setSelectedSessionId('');
      setManualSession(false);
      setSessionDate(format(new Date(), 'yyyy-MM-dd'));
      setStartTime(format(new Date(), 'HH:mm'));
      setEndTime('');
      setServiceSetting('school');
      setLocationDetail('');
      setAutoPullEnabled(true);
      setAuthorRole(userRole === 'admin' || userRole === 'super_admin' ? 'BCBA' : 'RBT');
    }
  }, [open, userRole]);

  // Update billable default when note type changes
  useEffect(() => {
    setIsBillable(NOTE_TYPE_DEFAULT_BILLABLE[noteType] ?? true);
  }, [noteType]);

  const generatePulledDataSnapshot = (): PulledDataSnapshot | null => {
    if (!autoPullEnabled || !isBillable) return null;
    const sessionStartTime = new Date(`${sessionDate}T${startTime}`);
    const sessionEndTime = endTime ? new Date(`${sessionDate}T${endTime}`) : new Date();
    const durationMinutes = Math.round((sessionEndTime.getTime() - sessionStartTime.getTime()) / 60000);
    return {
      sessionTiming: { startTime: sessionStartTime.toISOString(), endTime: sessionEndTime.toISOString(), durationMinutes: Math.max(0, durationMinutes) },
      setting: serviceSetting,
      location: locationDetail,
      behaviors: [],
      skills: [],
      pulledAt: new Date().toISOString(),
    };
  };

  const handleCreate = async () => {
    if (!user) return;
    setCreating(true);
    try {
      const pulledData = generatePulledDataSnapshot();
      const startDateTime = new Date(`${sessionDate}T${startTime}`);
      const endDateTime = endTime ? new Date(`${sessionDate}T${endTime}`) : null;
      const durationMinutes = endDateTime ? Math.round((endDateTime.getTime() - startDateTime.getTime()) / 60000) : undefined;

      await createNote({
        note_type: noteType,
        author_role: authorRole,
        session_id: selectedSessionId || undefined,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime?.toISOString(),
        duration_minutes: durationMinutes,
        service_setting: serviceSetting,
        location_detail: locationDetail,
        auto_pull_enabled: autoPullEnabled && isBillable,
        pulled_data_snapshot: pulledData,
        note_content: {},
        status: 'draft',
        billable: isBillable,
        clinician_signature_name: profile?.display_name || (profile?.first_name && profile?.last_name ? `${profile.first_name} ${profile.last_name}` : undefined),
        credential: authorRole,
      });
      onNoteCreated();
      onOpenChange(false);
    } finally {
      setCreating(false);
    }
  };

  const canProceed = () => {
    if (step === 'type') return noteType && authorRole;
    if (step === 'billable') return true; // Billable selection is always valid
    if (step === 'session') return manualSession || selectedSessionId || !isBillable;
    return true;
  };

  const getStepNumber = () => {
    const steps: Step[] = ['type', 'billable', 'session', 'data'];
    return steps.indexOf(step) + 1;
  };

  const getTotalSteps = () => isBillable ? 4 : 3;

  const handleNext = () => {
    if (step === 'type') setStep('billable');
    else if (step === 'billable') {
      if (isBillable) {
        setStep('session');
      } else {
        setStep('data');
      }
    }
    else if (step === 'session') setStep('data');
    else handleCreate();
  };

  const handleBack = () => {
    if (step === 'billable') setStep('type');
    else if (step === 'session') setStep('billable');
    else if (step === 'data') {
      if (isBillable) {
        setStep('session');
      } else {
        setStep('billable');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileText className="w-5 h-5" />Create Clinical Note</DialogTitle>
          <DialogDescription>{studentName} • Step {getStepNumber()} of {getTotalSteps()}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          {/* STEP 1: NOTE TYPE */}
          {step === 'type' && (
            <div className="space-y-4">
              <div>
                <Label>Note Type</Label>
                <div className="grid grid-cols-1 gap-2 mt-2">
                  {Object.entries(NOTE_TYPE_LABELS).map(([key, label]) => (
                    <Card key={key} className={`cursor-pointer transition-colors ${noteType === key ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`} onClick={() => setNoteType(key as SessionNoteType)}>
                      <CardContent className="py-3 px-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{label}</p>
                          {NOTE_TYPE_DEFAULT_BILLABLE[key as SessionNoteType] === false && (
                            <Badge variant="outline" className="text-xs">Non-billable default</Badge>
                          )}
                        </div>
                        {noteType === key && <CheckCircle2 className="w-5 h-5 text-primary" />}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
              <div>
                <Label>Your Role</Label>
                <Select value={authorRole} onValueChange={(v) => setAuthorRole(v as AuthorRole)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AUTHOR_ROLE_OPTIONS.map(role => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* STEP 2: BILLABLE SELECTION */}
          {step === 'billable' && (
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Is this note billable?
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  This determines whether the note routes to Session Review and affects authorization tracking.
                </p>
              </div>

              <RadioGroup value={isBillable ? 'yes' : 'no'} onValueChange={(v) => setIsBillable(v === 'yes')} className="space-y-3">
                <Card className={`cursor-pointer transition-colors ${isBillable ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`} onClick={() => setIsBillable(true)}>
                  <CardContent className="py-4 px-4">
                    <div className="flex items-start gap-3">
                      <RadioGroupItem value="yes" id="billable-yes" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="billable-yes" className="font-semibold cursor-pointer flex items-center gap-2">
                          <Badge className="bg-primary/20 text-primary">BILLABLE</Badge>
                          Yes, this is a billable clinical note
                        </Label>
                        <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                          <li>• Routes to Session Review workflow</li>
                          <li>• Can pull session data (timing, behaviors, skills)</li>
                          <li>• Tracks against authorization/utilization</li>
                          <li>• Should be linked to appointment/session</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`cursor-pointer transition-colors ${!isBillable ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`} onClick={() => setIsBillable(false)}>
                  <CardContent className="py-4 px-4">
                    <div className="flex items-start gap-3">
                      <RadioGroupItem value="no" id="billable-no" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="billable-no" className="font-semibold cursor-pointer flex items-center gap-2">
                          <Badge variant="outline">NON-BILLABLE</Badge>
                          No, this is a non-billable clinical note
                        </Label>
                        <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                          <li>• Does NOT route to Session Review</li>
                          <li>• Does NOT affect authorization/utilization</li>
                          <li>• Does NOT require session timing</li>
                          <li>• Still visible in clinical notes and exportable</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </RadioGroup>
            </div>
          )}

          {/* STEP 3: SESSION LINKING (only for billable) */}
          {step === 'session' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Link2 className="w-4 h-4" />
                    Link to Session
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Connect this note to an existing session or create standalone.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <Switch checked={manualSession} onCheckedChange={setManualSession} id="manual-session" />
                <Label htmlFor="manual-session">Create without existing session</Label>
              </div>
              
              {!manualSession && studentSessions.length > 0 ? (
                <div className="space-y-3">
                  <Label>Select Existing Session</Label>
                  <ScrollArea className="h-[200px] border rounded-md p-2">
                    <div className="space-y-2">
                      {studentSessions.slice(0, 10).map(session => (
                        <Card key={session.id} className={`cursor-pointer transition-colors ${selectedSessionId === session.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`} onClick={() => { setSelectedSessionId(session.id); setSessionDate(format(new Date(session.date), 'yyyy-MM-dd')); }}>
                          <CardContent className="py-3 px-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">{format(new Date(session.date), 'EEEE, MMM d, yyyy')}</p>
                                <p className="text-xs text-muted-foreground">Session • {session.sessionLengthMinutes} min</p>
                              </div>
                              {selectedSessionId === session.id && <CheckCircle2 className="w-5 h-5 text-primary" />}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="space-y-3">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Creating without a linked session. You can still enter timing manually.
                    </AlertDescription>
                  </Alert>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label htmlFor="session-date">Date</Label><Input id="session-date" type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} className="mt-1" /></div>
                    <div><Label htmlFor="start-time">Start Time</Label><Input id="start-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label htmlFor="end-time">End Time</Label><Input id="end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1" /></div>
                    <div><Label>Service Setting</Label><Select value={serviceSetting} onValueChange={(v) => setServiceSetting(v as ServiceSetting)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(SERVICE_SETTING_LABELS).map(([key, label]) => (<SelectItem key={key} value={key}>{label}</SelectItem>))}</SelectContent></Select></div>
                  </div>
                  <div><Label htmlFor="location">Location Detail</Label><Input id="location" value={locationDetail} onChange={(e) => setLocationDetail(e.target.value)} placeholder="e.g., Room 204" className="mt-1" /></div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: DATA OPTIONS */}
          {step === 'data' && (
            <div className="space-y-4">
              {isBillable && (
                <Card className="border-dashed">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Database className="w-5 h-5 text-primary" />
                        <div><p className="font-medium">Auto-Pull Session Data</p><p className="text-xs text-muted-foreground">Include behavior and skill data from the session</p></div>
                      </div>
                      <Switch checked={autoPullEnabled} onCheckedChange={setAutoPullEnabled} />
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
                <p className="font-medium">Ready to create note</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <FileText className="w-3 h-3" />
                    {NOTE_TYPE_LABELS[noteType]}
                  </li>
                  <li className="flex items-center gap-2">
                    <DollarSign className="w-3 h-3" />
                    {isBillable ? (
                      <Badge className="bg-primary/20 text-primary text-xs">BILLABLE</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">NON-BILLABLE</Badge>
                    )}
                  </li>
                  {isBillable && (
                    <>
                      <li className="flex items-center gap-2">
                        <MapPin className="w-3 h-3" />
                        {SERVICE_SETTING_LABELS[serviceSetting]}
                      </li>
                      <li className="flex items-center gap-2">
                        <Database className="w-3 h-3" />
                        {autoPullEnabled ? 'Session data will be auto-pulled' : 'Manual data entry'}
                      </li>
                    </>
                  )}
                </ul>
                {isBillable && (
                  <p className="text-xs text-muted-foreground pt-2 border-t mt-2">
                    This note will route to Session Review for supervisor approval.
                  </p>
                )}
              </div>
            </div>
          )}
        </ScrollArea>
        <DialogFooter className="flex-row justify-between">
          <Button variant="outline" onClick={step === 'type' ? () => onOpenChange(false) : handleBack}>{step === 'type' ? 'Cancel' : 'Back'}</Button>
          <Button onClick={handleNext} disabled={!canProceed() || creating}>{creating ? 'Creating...' : step === 'data' ? 'Create Note' : 'Next'}{step !== 'data' && <ArrowRight className="w-4 h-4 ml-2" />}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
