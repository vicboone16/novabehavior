import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Trash2, Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import {
  TOIEventType,
  TOILocation,
  TOIContributor,
  TOI_EVENT_LABELS,
  TOI_LOCATION_LABELS,
  TOI_CONTRIBUTOR_LABELS,
  formatDuration,
} from '@/types/toi';
import { format } from 'date-fns';

interface Student {
  id: string;
  name: string;
}

interface BulkEntry {
  id: string;
  studentId: string;
  eventType: TOIEventType | '';
  startTime: string;
  endTime: string;
  location: TOILocation | '';
  contributor: TOIContributor | '';
  notes: string;
  error?: string;
  success?: boolean;
}

interface BulkTOIEntryProps {
  students: Student[];
  onClose?: () => void;
}

export function BulkTOIEntry({ students, onClose }: BulkTOIEntryProps) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<BulkEntry[]>([createEmptyEntry()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);

  function createEmptyEntry(): BulkEntry {
    return {
      id: crypto.randomUUID(),
      studentId: '',
      eventType: '',
      startTime: '',
      endTime: '',
      location: '',
      contributor: '',
      notes: '',
    };
  }

  const addRow = () => {
    setEntries([...entries, createEmptyEntry()]);
  };

  const removeRow = (id: string) => {
    if (entries.length > 1) {
      setEntries(entries.filter(e => e.id !== id));
    }
  };

  const updateEntry = (id: string, field: keyof BulkEntry, value: string) => {
    setEntries(entries.map(e =>
      e.id === id ? { ...e, [field]: value, error: undefined, success: undefined } : e
    ));
  };

  const calculateDuration = (start: string, end: string): number | null => {
    if (!start || !end) return null;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const minutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
    return minutes > 0 ? minutes : null;
  };

  const validateEntry = (entry: BulkEntry): string | null => {
    if (!entry.studentId) return 'Student is required';
    if (!entry.eventType) return 'Type is required';
    if (!entry.startTime) return 'Start time is required';
    if (!entry.endTime) return 'End time is required';
    
    const duration = calculateDuration(entry.startTime, entry.endTime);
    if (duration === null || duration <= 0) {
      return "End time can't be earlier than start time";
    }
    
    return null;
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      toast({ title: 'Not authenticated', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    const results = await Promise.all(
      entries.map(async (entry) => {
        const validationError = validateEntry(entry);
        if (validationError) {
          return { ...entry, error: validationError };
        }

        try {
          const insertData = {
            student_id: entry.studentId,
            event_type: entry.eventType as TOIEventType,
            display_label: TOI_EVENT_LABELS[entry.eventType as TOIEventType],
            start_time: new Date(entry.startTime).toISOString(),
            end_time: new Date(entry.endTime).toISOString(),
            location: (entry.location || null) as TOILocation | null,
            suspected_contributor: (entry.contributor || null) as TOIContributor | null,
            notes: entry.notes || null,
            created_by_user_id: user.id,
            is_active: false,
          };

          const { error } = await supabase
            .from('context_barriers_events')
            .insert(insertData as any);

          if (error) {
            if (error.message.includes('overlaps')) {
              return { ...entry, error: 'This TOI block overlaps an existing entry for this student' };
            }
            return { ...entry, error: error.message };
          }

          return { ...entry, success: true };
        } catch (err: any) {
          return { ...entry, error: err.message };
        }
      })
    );

    setEntries(results);
    setIsSubmitting(false);
    setShowResults(true);

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => r.error).length;

    toast({
      title: 'Bulk Import Complete',
      description: `Saved: ${successCount} entries. Errors: ${errorCount} entries.`,
      variant: errorCount > 0 ? 'destructive' : 'default',
    });
  };

  const successfulEntries = entries.filter(e => e.success).length;
  const errorEntries = entries.filter(e => e.error).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5" />
          Bulk TOI Entry
        </CardTitle>
        <CardDescription>
          Add multiple TOI entries across students. Each row creates one entry.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {showResults && (
          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-primary" />
              <span>Saved: {successfulEntries}</span>
            </div>
            {errorEntries > 0 && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                <span>Errors: {errorEntries}</span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() => {
                setEntries([createEmptyEntry()]);
                setShowResults(false);
              }}
            >
              Clear & Start New
            </Button>
          </div>
        )}

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">Student *</TableHead>
                <TableHead className="min-w-[140px]">Type *</TableHead>
                <TableHead className="min-w-[160px]">Start *</TableHead>
                <TableHead className="min-w-[160px]">End *</TableHead>
                <TableHead className="min-w-[80px]">Duration</TableHead>
                <TableHead className="min-w-[120px]">Location</TableHead>
                <TableHead className="min-w-[130px]">Contributor</TableHead>
                <TableHead className="min-w-[150px]">Notes</TableHead>
                <TableHead className="w-[80px]">Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => {
                const duration = calculateDuration(entry.startTime, entry.endTime);
                return (
                  <TableRow key={entry.id} className={entry.error ? 'bg-destructive/5' : entry.success ? 'bg-primary/5' : ''}>
                    <TableCell>
                      <Select
                        value={entry.studentId}
                        onValueChange={(v) => updateEntry(entry.id, 'studentId', v)}
                        disabled={entry.success}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {students.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={entry.eventType}
                        onValueChange={(v) => updateEntry(entry.id, 'eventType', v)}
                        disabled={entry.success}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TOI_EVENT_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="datetime-local"
                        value={entry.startTime}
                        onChange={(e) => updateEntry(entry.id, 'startTime', e.target.value)}
                        disabled={entry.success}
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="datetime-local"
                        value={entry.endTime}
                        onChange={(e) => updateEntry(entry.id, 'endTime', e.target.value)}
                        disabled={entry.success}
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm">
                      {duration !== null && duration > 0 ? formatDuration(duration) : '--'}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={entry.location}
                        onValueChange={(v) => updateEntry(entry.id, 'location', v)}
                        disabled={entry.success}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Optional" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TOI_LOCATION_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={entry.contributor}
                        onValueChange={(v) => updateEntry(entry.id, 'contributor', v)}
                        disabled={entry.success}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Optional" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TOI_CONTRIBUTOR_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={entry.notes}
                        onChange={(e) => updateEntry(entry.id, 'notes', e.target.value)}
                        disabled={entry.success}
                        placeholder="Notes..."
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>
                      {entry.success ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle className="w-3 h-3" /> Saved
                        </Badge>
                      ) : entry.error ? (
                        <Badge variant="destructive" className="gap-1" title={entry.error}>
                          <AlertCircle className="w-3 h-3" /> Error
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(entry.id)}
                        disabled={entries.length === 1 || entry.success}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={addRow} disabled={isSubmitting}>
            <Plus className="mr-2 w-4 h-4" />
            Add Row
          </Button>

          <div className="flex gap-2">
            {onClose && (
              <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
            )}
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : `Save ${entries.length} Entries`}
            </Button>
          </div>
        </div>

        {entries.some(e => e.error) && (
          <div className="rounded-lg bg-destructive/10 p-4 space-y-2">
            <p className="text-sm font-medium text-destructive">Errors found:</p>
            {entries.filter(e => e.error).map((entry, idx) => (
              <p key={entry.id} className="text-sm text-destructive">
                Row {entries.indexOf(entry) + 1}: {entry.error}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
