import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, FileText, Edit3, ChevronDown, ChevronUp, Users, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useSessionStaffNotes, NoteFormat } from '@/hooks/useSessionStaffNotes';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface StudentSessionNotesProps {
  sessionId: string | null | undefined;
  studentId: string;
  studentName: string;
  showApprovePrompt?: boolean;
  compact?: boolean;
}

export function StudentSessionNotes({
  sessionId,
  studentId,
  studentName,
  showApprovePrompt = false,
  compact = false,
}: StudentSessionNotesProps) {
  const { user } = useAuth();
  const { notes, myNote, saving, saveNote, approveNote, unapproveNote } = useSessionStaffNotes(sessionId, studentId);

  const [open, setOpen] = useState(!compact);
  const [noteFormat, setNoteFormat] = useState<NoteFormat>('regular');
  const [noteText, setNoteText] = useState('');
  const [soapS, setSoapS] = useState('');
  const [soapO, setSoapO] = useState('');
  const [soapA, setSoapA] = useState('');
  const [soapP, setSoapP] = useState('');
  const [dirty, setDirty] = useState(false);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  // Sync when note loads from DB
  useEffect(() => {
    if (myNote) {
      setNoteFormat(myNote.note_format);
      setNoteText(myNote.note_text || '');
      setSoapS(myNote.soap_subjective || '');
      setSoapO(myNote.soap_objective || '');
      setSoapA(myNote.soap_assessment || '');
      setSoapP(myNote.soap_plan || '');
    }
  }, [myNote?.id]);

  const isApproved = myNote?.status === 'approved';

  const hasContent = noteFormat === 'regular'
    ? noteText.trim().length > 0
    : soapS.trim().length > 0 || soapO.trim().length > 0 || soapA.trim().length > 0 || soapP.trim().length > 0;

  const triggerSave = (overrideFormat?: NoteFormat) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setDirty(true);
    const fmt = overrideFormat ?? noteFormat;
    saveTimer.current = setTimeout(async () => {
      await saveNote({
        note_format: fmt,
        note_text: fmt === 'regular' ? noteText : undefined,
        soap_subjective: fmt === 'soap' ? soapS : undefined,
        soap_objective: fmt === 'soap' ? soapO : undefined,
        soap_assessment: fmt === 'soap' ? soapA : undefined,
        soap_plan: fmt === 'soap' ? soapP : undefined,
      });
      setDirty(false);
    }, 1500);
  };

  const handleFormatChange = (v: string) => {
    const newFmt = v as NoteFormat;
    setNoteFormat(newFmt);
    triggerSave(newFmt);
  };

  const handleApprove = async () => {
    await saveNote({
      note_format: noteFormat,
      note_text: noteFormat === 'regular' ? noteText : undefined,
      soap_subjective: noteFormat === 'soap' ? soapS : undefined,
      soap_objective: noteFormat === 'soap' ? soapO : undefined,
      soap_assessment: noteFormat === 'soap' ? soapA : undefined,
      soap_plan: noteFormat === 'soap' ? soapP : undefined,
    });
    await approveNote();
  };

  const otherNotes = notes.filter(n => n.author_user_id !== user?.id);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 w-full justify-between px-2 text-sm font-medium"
        >
          <span className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Session Notes — {studentName}
            {isApproved && (
              <Badge className="bg-primary/15 text-primary border-primary/30 text-xs">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Approved
              </Badge>
            )}
            {!isApproved && hasContent && (
              <Badge variant="secondary" className="text-xs">Draft</Badge>
            )}
            {otherNotes.length > 0 && (
              <Badge variant="outline" className="text-xs gap-1">
                <Users className="w-3 h-3" />
                +{otherNotes.length} staff
              </Badge>
            )}
          </span>
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="pt-2 space-y-3">
        {/* My note */}
        <div className={cn(
          'rounded-lg border p-3 space-y-3 transition-colors',
          isApproved ? 'bg-primary/5 border-primary/20' : 'bg-background border-border'
        )}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">My Note</span>
            {!isApproved && (
              <Tabs value={noteFormat} onValueChange={handleFormatChange}>
                <TabsList className="h-7">
                  <TabsTrigger value="regular" className="text-xs px-2 h-6">Regular</TabsTrigger>
                  <TabsTrigger value="soap" className="text-xs px-2 h-6">SOAP</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
            {isApproved && (
              <Badge variant="outline" className="text-xs capitalize">{noteFormat} note</Badge>
            )}
          </div>

          {!isApproved ? (
            <>
              {noteFormat === 'regular' && (
                <Textarea
                  placeholder={`Add session notes for ${studentName}...`}
                  value={noteText}
                  onChange={(e) => { setNoteText(e.target.value); triggerSave(); }}
                  className="min-h-[80px] text-sm resize-none"
                />
              )}

              {noteFormat === 'soap' && (
                <div className="space-y-2">
                  {([
                    { key: 'S', label: 'Subjective', value: soapS, setter: setSoapS, placeholder: 'Client/caregiver report, observations, presenting concerns...' },
                    { key: 'O', label: 'Objective', value: soapO, setter: setSoapO, placeholder: 'Measurable data, behaviors observed, session metrics...' },
                    { key: 'A', label: 'Assessment', value: soapA, setter: setSoapA, placeholder: 'Clinical interpretation, progress toward goals, effectiveness...' },
                    { key: 'P', label: 'Plan', value: soapP, setter: setSoapP, placeholder: 'Next steps, modifications, recommendations...' },
                  ] as const).map(({ key, label, value, setter, placeholder }) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-xs font-semibold flex items-center gap-1">
                        <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center">{key}</span>
                        {label}
                      </Label>
                      <Textarea
                        placeholder={placeholder}
                        value={value}
                        onChange={(e) => { setter(e.target.value); triggerSave(); }}
                        className="min-h-[56px] text-sm resize-none"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-muted-foreground">
                  {dirty ? 'Saving...' : myNote ? (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Saved {format(new Date(myNote.updated_at), 'h:mm a')}
                    </span>
                  ) : 'Not yet saved'}
                </span>
                {showApprovePrompt && hasContent && (
                  <Button
                    size="sm"
                    onClick={handleApprove}
                    disabled={saving}
                    className="h-7 text-xs gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Approve Note
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-2">
              {noteFormat === 'regular' && (
                <p className="text-sm text-foreground whitespace-pre-wrap">{noteText || '—'}</p>
              )}
              {noteFormat === 'soap' && (
                <div className="space-y-2">
                  {([
                    { key: 'S', label: 'Subjective', value: soapS },
                    { key: 'O', label: 'Objective', value: soapO },
                    { key: 'A', label: 'Assessment', value: soapA },
                    { key: 'P', label: 'Plan', value: soapP },
                  ] as const).map(({ key, label, value }) => (
                    <div key={key}>
                      <span className="text-xs font-semibold text-muted-foreground">{key} — {label}</span>
                      <p className="text-sm whitespace-pre-wrap mt-0.5">{value || '—'}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-primary" />
                  Approved {myNote?.approved_at ? format(new Date(myNote.approved_at), 'h:mm a') : ''}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={unapproveNote}
                  disabled={saving}
                  className="h-7 text-xs gap-1 text-muted-foreground"
                >
                  <Edit3 className="w-3 h-3" />
                  Edit
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Other staff notes */}
        {otherNotes.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Users className="w-3 h-3" /> Other Staff Notes
            </p>
            {otherNotes.map(staffNote => (
              <div key={staffNote.id} className={cn(
                'rounded-lg border p-3 text-sm space-y-1',
                staffNote.status === 'approved' ? 'bg-primary/5 border-primary/20' : 'bg-muted/40 border-border'
              )}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">{staffNote.author_name || 'Staff'}</span>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs capitalize">{staffNote.note_format}</Badge>
                    {staffNote.status === 'approved' && (
                      <Badge className="bg-primary/15 text-primary border-primary/30 text-xs">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Approved
                      </Badge>
                    )}
                  </div>
                </div>
                {staffNote.note_format === 'regular' && (
                  <p className="text-foreground whitespace-pre-wrap">{staffNote.note_text || '—'}</p>
                )}
                {staffNote.note_format === 'soap' && (
                  <div className="space-y-1">
                    {[
                      { key: 'S', val: staffNote.soap_subjective },
                      { key: 'O', val: staffNote.soap_objective },
                      { key: 'A', val: staffNote.soap_assessment },
                      { key: 'P', val: staffNote.soap_plan },
                    ].filter(x => x.val).map(({ key, val }) => (
                      <p key={key}><span className="font-semibold text-muted-foreground">{key}:</span> {val}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
