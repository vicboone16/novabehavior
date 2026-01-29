import { format } from 'date-fns';
import { 
  FileText, 
  Clock, 
  User, 
  MapPin, 
  Database,
  CheckCircle2,
  Download,
  Copy,
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  EnhancedSessionNote,
  NOTE_TYPE_LABELS,
  SERVICE_SETTING_LABELS,
} from '@/types/sessionNotes';
import { toast } from '@/hooks/use-toast';

interface NoteViewDialogProps {
  note: EnhancedSessionNote;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NoteViewDialog({ note, open, onOpenChange }: NoteViewDialogProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  const generateNoteText = (): string => {
    const lines: string[] = [];
    
    // Header
    lines.push(`SESSION NOTE - ${NOTE_TYPE_LABELS[note.note_type]}`);
    lines.push(`Date: ${format(new Date(note.start_time), 'MMMM d, yyyy')}`);
    lines.push(`Time: ${format(new Date(note.start_time), 'h:mm a')}${note.end_time ? ` - ${format(new Date(note.end_time), 'h:mm a')}` : ''}`);
    if (note.duration_minutes) {
      lines.push(`Duration: ${note.duration_minutes} minutes`);
    }
    lines.push(`Setting: ${SERVICE_SETTING_LABELS[note.service_setting]}`);
    if (note.location_detail) {
      lines.push(`Location: ${note.location_detail}`);
    }
    lines.push('');

    // Session Data Summary
    if (note.pulled_data_snapshot) {
      lines.push('--- SESSION DATA SUMMARY ---');
      
      if (note.pulled_data_snapshot.behaviors?.length > 0) {
        lines.push('');
        lines.push('Behavior Data:');
        note.pulled_data_snapshot.behaviors.forEach(b => {
          const parts: string[] = [];
          if (b.frequencyCount > 0) parts.push(`${b.frequencyCount} occurrences`);
          if (b.durationSeconds > 0) parts.push(`${formatDuration(b.durationSeconds)} total`);
          if (b.intervalPercentage > 0) parts.push(`${b.intervalPercentage}% of intervals`);
          if (b.abcCount > 0) parts.push(`${b.abcCount} ABC records`);
          lines.push(`  • ${b.behaviorName}: ${parts.join(', ')}`);
        });
      }

      if (note.pulled_data_snapshot.skills?.length > 0) {
        lines.push('');
        lines.push('Skill Acquisition:');
        note.pulled_data_snapshot.skills.forEach(s => {
          lines.push(`  • ${s.targetName}: ${s.trialsCompleted} trials, ${s.percentCorrect}% correct`);
        });
      }
      lines.push('');
    }

    // Note Content
    if (note.note_content && Object.keys(note.note_content).length > 0) {
      lines.push('--- NOTE CONTENT ---');
      lines.push('');
      
      Object.entries(note.note_content).forEach(([key, value]) => {
        if (value) {
          const label = key
            .replace(/_/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase());
          
          if (Array.isArray(value)) {
            lines.push(`${label}: ${value.join(', ')}`);
          } else {
            lines.push(`${label}:`);
            lines.push(String(value));
          }
          lines.push('');
        }
      });
    }

    // Signature
    lines.push('---');
    if (note.clinician_signature_name) {
      lines.push(`Clinician: ${note.clinician_signature_name}`);
    }
    if (note.credential) {
      lines.push(`Credential: ${note.credential}`);
    }
    lines.push(`Status: ${note.status.toUpperCase()}`);

    return lines.join('\n');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateNoteText());
    toast({ title: 'Copied', description: 'Note text copied to clipboard.' });
  };

  const handleExportPDF = () => {
    // For now, just copy - PDF export would require a library like jsPDF
    handleCopy();
    toast({ 
      title: 'Export', 
      description: 'Note text copied. PDF export coming soon.',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {NOTE_TYPE_LABELS[note.note_type]}
          </DialogTitle>
          <DialogDescription>
            {format(new Date(note.start_time), 'EEEE, MMMM d, yyyy')} • 
            {note.author_name || 'Unknown Author'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="content" className="flex-1 overflow-hidden flex flex-col">
          <TabsList>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="data">Session Data</TabsTrigger>
            <TabsTrigger value="info">Details</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 -mx-6 px-6 mt-4">
            <TabsContent value="content" className="mt-0 space-y-4">
              {/* Note Content */}
              {note.note_content && Object.keys(note.note_content).length > 0 ? (
                Object.entries(note.note_content).map(([key, value]) => {
                  if (!value) return null;
                  
                  const label = key
                    .replace(/_/g, ' ')
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/^./, str => str.toUpperCase());

                  return (
                    <div key={key}>
                      <Label className="text-xs text-muted-foreground">{label}</Label>
                      {Array.isArray(value) ? (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {value.map((item, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {String(item)}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm mt-1 whitespace-pre-wrap">{String(value)}</p>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No content has been added to this note yet.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="data" className="mt-0 space-y-4">
              {note.pulled_data_snapshot ? (
                <>
                  {/* Behaviors */}
                  {note.pulled_data_snapshot.behaviors?.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Behavior Data</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {note.pulled_data_snapshot.behaviors.map(behavior => (
                          <div key={behavior.behaviorId} className="flex flex-wrap gap-2">
                            <span className="font-medium text-sm">{behavior.behaviorName}:</span>
                            {behavior.frequencyCount > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {behavior.frequencyCount} freq
                              </Badge>
                            )}
                            {behavior.durationSeconds > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {formatDuration(behavior.durationSeconds)}
                              </Badge>
                            )}
                            {behavior.intervalPercentage > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {behavior.intervalPercentage}% intervals
                              </Badge>
                            )}
                            {behavior.abcCount > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {behavior.abcCount} ABC
                              </Badge>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Skills */}
                  {note.pulled_data_snapshot.skills?.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Skill Acquisition</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {note.pulled_data_snapshot.skills.map(skill => (
                          <div key={skill.targetId} className="flex flex-wrap gap-2">
                            <span className="font-medium text-sm">{skill.targetName}:</span>
                            <Badge variant="outline" className="text-xs">
                              {skill.trialsCompleted} trials
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {skill.percentCorrect}% correct
                            </Badge>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  <div className="text-xs text-muted-foreground">
                    <Database className="w-3 h-3 inline mr-1" />
                    Data pulled at {format(new Date(note.pulled_data_snapshot.pulledAt), 'MMM d, yyyy h:mm a')}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No session data linked to this note.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="info" className="mt-0 space-y-4">
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Date</Label>
                      <p className="text-sm font-medium">
                        {format(new Date(note.start_time), 'MMMM d, yyyy')}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Time</Label>
                      <p className="text-sm font-medium">
                        {format(new Date(note.start_time), 'h:mm a')}
                        {note.end_time && ` - ${format(new Date(note.end_time), 'h:mm a')}`}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Duration</Label>
                      <p className="text-sm font-medium">
                        {note.duration_minutes ? `${note.duration_minutes} minutes` : 'Not recorded'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Setting</Label>
                      <p className="text-sm font-medium">
                        {SERVICE_SETTING_LABELS[note.service_setting]}
                      </p>
                    </div>
                    {note.location_detail && (
                      <div className="col-span-2">
                        <Label className="text-xs text-muted-foreground">Location</Label>
                        <p className="text-sm font-medium">{note.location_detail}</p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Author</Label>
                      <p className="text-sm font-medium">{note.author_name || 'Unknown'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Role</Label>
                      <p className="text-sm font-medium">{note.author_role}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Status</Label>
                      <Badge variant="outline" className="mt-1">
                        {note.status.charAt(0).toUpperCase() + note.status.slice(1)}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Billable</Label>
                      <p className="text-sm font-medium">{note.billable ? 'Yes' : 'No'}</p>
                    </div>
                  </div>

                  {note.clinician_signature_name && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-xs text-muted-foreground">Signature</Label>
                        <p className="text-sm font-medium">
                          {note.clinician_signature_name}
                          {note.credential && `, ${note.credential}`}
                        </p>
                        {note.signed_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Signed: {format(new Date(note.signed_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  <Separator />

                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Created: {format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}</p>
                    <p>Last Updated: {format(new Date(note.updated_at), 'MMM d, yyyy h:mm a')}</p>
                    {note.submitted_at && (
                      <p>Submitted: {format(new Date(note.submitted_at), 'MMM d, yyyy h:mm a')}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <div className="flex justify-between border-t pt-4 mt-4">
          <Button variant="outline" onClick={handleCopy}>
            <Copy className="w-4 h-4 mr-2" />
            Copy Text
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportPDF}>
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
