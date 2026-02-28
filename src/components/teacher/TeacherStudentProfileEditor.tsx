import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Calendar, FileText, GraduationCap, Stethoscope,
  ChevronDown, ChevronUp, Save, Loader2, X, Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

/**
 * Education-only funding modes available to independent teachers.
 * Insurance/billing modes are intentionally excluded.
 */
const EDUCATION_FUNDING_MODES = [
  { value: 'gen_ed', label: 'Gen Ed' },
  { value: 'sped', label: 'SPED' },
  { value: '504', label: '504' },
  { value: 'iep', label: 'IEP' },
  { value: 'mtss_tier2', label: 'MTSS / Tier 2' },
  { value: 'mtss_tier3', label: 'MTSS / Tier 3' },
] as const;

interface TeacherStudentProfileEditorProps {
  studentId: string;
  studentName: string;
}

export function TeacherStudentProfileEditor({
  studentId,
  studentName,
}: TeacherStudentProfileEditorProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [iepDate, setIepDate] = useState('');
  const [iepEndDate, setIepEndDate] = useState('');
  const [nextIepReviewDate, setNextIepReviewDate] = useState('');
  const [diagnoses, setDiagnoses] = useState<string[]>([]);
  const [newDiagnosis, setNewDiagnosis] = useState('');
  const [fundingMode, setFundingMode] = useState('');

  // Track if user has made changes
  const [isDirty, setIsDirty] = useState(false);

  // Load current values when expanded
  useEffect(() => {
    if (!isExpanded) return;

    const load = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('students')
          .select('iep_date, iep_end_date, next_iep_review_date, diagnoses, funding_mode')
          .eq('id', studentId)
          .single();

        if (error) throw error;

        setIepDate(data.iep_date || '');
        setIepEndDate(data.iep_end_date || '');
        setNextIepReviewDate(data.next_iep_review_date || '');
        setDiagnoses(Array.isArray(data.diagnoses) ? (data.diagnoses as string[]) : []);
        setFundingMode(data.funding_mode || '');
        setIsDirty(false);
      } catch (err) {
        console.error('Error loading student profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [isExpanded, studentId]);

  const handleAddDiagnosis = () => {
    const trimmed = newDiagnosis.trim();
    if (!trimmed || diagnoses.includes(trimmed)) return;
    setDiagnoses((prev) => [...prev, trimmed]);
    setNewDiagnosis('');
    setIsDirty(true);
  };

  const handleRemoveDiagnosis = (dx: string) => {
    setDiagnoses((prev) => prev.filter((d) => d !== dx));
    setIsDirty(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('students')
        .update({
          iep_date: iepDate || null,
          iep_end_date: iepEndDate || null,
          next_iep_review_date: nextIepReviewDate || null,
          diagnoses: diagnoses.length > 0 ? diagnoses : null,
          funding_mode: fundingMode || null,
        })
        .eq('id', studentId);

      if (error) throw error;

      setIsDirty(false);
      toast({
        title: 'Profile Updated',
        description: `${studentName}'s profile info saved.`,
      });
    } catch (err) {
      console.error('Error saving profile:', err);
      toast({
        title: 'Error saving',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-dashed">
      <CardHeader
        className="cursor-pointer py-3 px-4"
        onClick={() => setIsExpanded((v) => !v)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            Student Info
          </CardTitle>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* IEP Dates */}
              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  IEP Dates
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Start</Label>
                    <Input
                      type="date"
                      value={iepDate}
                      onChange={(e) => { setIepDate(e.target.value); setIsDirty(true); }}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">End</Label>
                    <Input
                      type="date"
                      value={iepEndDate}
                      onChange={(e) => { setIepEndDate(e.target.value); setIsDirty(true); }}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Next Review</Label>
                    <Input
                      type="date"
                      value={nextIepReviewDate}
                      onChange={(e) => { setNextIepReviewDate(e.target.value); setIsDirty(true); }}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Diagnoses */}
              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5" />
                  Diagnoses
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {diagnoses.map((dx) => (
                    <Badge key={dx} variant="secondary" className="text-xs gap-1 pr-1">
                      {dx}
                      <button
                        onClick={() => handleRemoveDiagnosis(dx)}
                        className="ml-0.5 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                  {diagnoses.length === 0 && (
                    <span className="text-xs text-muted-foreground">None added</span>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <Input
                    placeholder="e.g. ADHD, ASD…"
                    value={newDiagnosis}
                    onChange={(e) => setNewDiagnosis(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddDiagnosis()}
                    className="h-8 text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2"
                    onClick={handleAddDiagnosis}
                    disabled={!newDiagnosis.trim()}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Funding Mode */}
              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5" />
                  Funding / Program Type
                </Label>
                <Select
                  value={fundingMode}
                  onValueChange={(v) => { setFundingMode(v); setIsDirty(true); }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {EDUCATION_FUNDING_MODES.map((m) => (
                      <SelectItem key={m.value} value={m.value} className="text-xs">
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Save button */}
              <Button
                size="sm"
                className="w-full"
                onClick={handleSave}
                disabled={!isDirty || isSaving}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-1" />
                )}
                Save Student Info
              </Button>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
