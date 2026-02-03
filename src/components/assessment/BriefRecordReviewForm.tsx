import { useState, useCallback, useEffect } from 'react';
import { 
  Save, RotateCcw, Plus, Trash2, FileText, CheckSquare,
  User, Calendar, BookOpen, Activity, Clock, AlertTriangle,
  FileCheck, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { AssessmentErrorBoundary } from './AssessmentErrorBoundary';

// Types
export interface BriefRecordReviewData {
  id: string;
  studentId: string;
  // Header fields
  grade: string;
  reviewer: string;
  date: string;
  // Respondent tracking
  respondentType: 'BCBA' | 'Teacher' | 'Staff' | 'Other';
  respondentName: string;
  respondentEmail?: string;
  // Section 1: Health Information
  healthReviewed: boolean;
  healthHistory: string;
  medicalDiagnoses: string;
  mentalHealthDiagnoses: string;
  medications: string;
  // Section 2: Academic/Benchmark Assessments
  academicReviewed: boolean;
  academicAssessments: AcademicAssessmentRow[];
  // Section 3: Previous Interventions
  interventionsReviewed: boolean;
  behaviorInterventions: string;
  academicInterventions: string;
  previousFBABIP: string;
  // Section 4: Attendance
  attendanceReviewed: boolean;
  previousAttendanceConcerns: 'No' | 'Yes' | '';
  tardy: string;
  earlyDismissal: string;
  absent: string;
  // Section 5: Discipline
  disciplineReviewed: boolean;
  disciplineRecords: DisciplineRow[];
  disciplineNotes: string;
  // Section 6: IEP Review
  iepReviewed: boolean;
  eligibilityDisability: string;
  services: string;
  programModifications: string;
  otherInformation: string;
  // Metadata
  status: 'draft' | 'submitted';
  createdAt: string;
  updatedAt: string;
}

interface AcademicAssessmentRow {
  id: string;
  category: 'Current' | 'Previous';
  gradeYear: string;
  assessment: string;
  boy: string;
  moy: string;
  eoy: string;
}

interface DisciplineRow {
  id: string;
  category: 'Current' | 'Previous';
  gradeYear: string;
  numReferrals: string;
  frequentInfractions: string;
  notes: string;
}

interface BriefRecordReviewFormProps {
  studentId: string;
  studentName: string;
  isExternal?: boolean;
  existingData?: Partial<BriefRecordReviewData>;
  onSave?: (data: BriefRecordReviewData, action: 'draft' | 'submit') => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

const createEmptyAcademicRow = (category: 'Current' | 'Previous'): AcademicAssessmentRow => ({
  id: crypto.randomUUID(),
  category,
  gradeYear: '',
  assessment: '',
  boy: '',
  moy: '',
  eoy: '',
});

const createEmptyDisciplineRow = (category: 'Current' | 'Previous'): DisciplineRow => ({
  id: crypto.randomUUID(),
  category,
  gradeYear: '',
  numReferrals: '',
  frequentInfractions: '',
  notes: '',
});

const getDefaultFormData = (studentId: string): BriefRecordReviewData => ({
  id: crypto.randomUUID(),
  studentId,
  grade: '',
  reviewer: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  respondentType: 'BCBA',
  respondentName: '',
  respondentEmail: '',
  healthReviewed: false,
  healthHistory: '',
  medicalDiagnoses: '',
  mentalHealthDiagnoses: '',
  medications: '',
  academicReviewed: false,
  academicAssessments: [
    createEmptyAcademicRow('Current'),
    createEmptyAcademicRow('Previous'),
  ],
  interventionsReviewed: false,
  behaviorInterventions: '',
  academicInterventions: '',
  previousFBABIP: '',
  attendanceReviewed: false,
  previousAttendanceConcerns: '',
  tardy: '',
  earlyDismissal: '',
  absent: '',
  disciplineReviewed: false,
  disciplineRecords: [
    createEmptyDisciplineRow('Current'),
    createEmptyDisciplineRow('Previous'),
  ],
  disciplineNotes: '',
  iepReviewed: false,
  eligibilityDisability: '',
  services: '',
  programModifications: '',
  otherInformation: '',
  status: 'draft',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// Safe string parser
const safeString = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
};

export function BriefRecordReviewForm({
  studentId,
  studentName,
  isExternal = false,
  existingData,
  onSave,
  onCancel,
  isLoading = false,
}: BriefRecordReviewFormProps) {
  const [formData, setFormData] = useState<BriefRecordReviewData>(() => ({
    ...getDefaultFormData(studentId),
    ...existingData,
  }));
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set([
    'health', 'academic', 'interventions', 'attendance', 'discipline', 'iep'
  ]));
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Safe field update
  const updateField = useCallback(<K extends keyof BriefRecordReviewData>(
    field: K,
    value: BriefRecordReviewData[K]
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  // Academic assessment row management
  const addAcademicRow = (category: 'Current' | 'Previous') => {
    updateField('academicAssessments', [
      ...formData.academicAssessments,
      createEmptyAcademicRow(category),
    ]);
  };

  const updateAcademicRow = (id: string, field: keyof AcademicAssessmentRow, value: string) => {
    updateField('academicAssessments', formData.academicAssessments.map(row =>
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const removeAcademicRow = (id: string) => {
    updateField('academicAssessments', formData.academicAssessments.filter(row => row.id !== id));
  };

  // Discipline row management
  const addDisciplineRow = (category: 'Current' | 'Previous') => {
    updateField('disciplineRecords', [
      ...formData.disciplineRecords,
      createEmptyDisciplineRow(category),
    ]);
  };

  const updateDisciplineRow = (id: string, field: keyof DisciplineRow, value: string) => {
    updateField('disciplineRecords', formData.disciplineRecords.map(row =>
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const removeDisciplineRow = (id: string) => {
    updateField('disciplineRecords', formData.disciplineRecords.filter(row => row.id !== id));
  };

  // Validation
  const validateForm = (isSubmit: boolean): string[] => {
    const errors: string[] = [];
    
    // Required fields for submit
    if (isSubmit) {
      if (!formData.reviewer.trim()) {
        errors.push('Reviewer is required');
      }
      if (!formData.date) {
        errors.push('Date is required');
      }
    }
    
    return errors;
  };

  // Handle save
  const handleSave = async (action: 'draft' | 'submit') => {
    const errors = validateForm(action === 'submit');
    if (errors.length > 0) {
      setValidationErrors(errors);
      toast.error(errors[0]);
      return;
    }
    
    setIsSaving(true);
    setValidationErrors([]);
    
    try {
      const dataToSave: BriefRecordReviewData = {
        ...formData,
        status: action === 'submit' ? 'submitted' : 'draft',
        updatedAt: new Date().toISOString(),
      };
      
      await onSave?.(dataToSave, action);
      
      if (action === 'submit') {
        toast.success('Brief Record Review submitted successfully.');
      } else {
        toast.success('Draft saved');
      }
    } catch (error) {
      console.error('Error saving Brief Record Review:', error);
      toast.error('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setFormData(getDefaultFormData(studentId));
    setValidationErrors([]);
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentAcademic = formData.academicAssessments.filter(r => r.category === 'Current');
  const previousAcademic = formData.academicAssessments.filter(r => r.category === 'Previous');
  const currentDiscipline = formData.disciplineRecords.filter(r => r.category === 'Current');
  const previousDiscipline = formData.disciplineRecords.filter(r => r.category === 'Previous');

  return (
    <AssessmentErrorBoundary onReset={handleReset}>
      <div className="space-y-4">
        {/* Header */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Brief Record Review
                </CardTitle>
                <CardDescription className="text-xs">
                  Functional Behavior Assessment - Records Review Form
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleReset} disabled={isSaving}>
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleSave('draft')} disabled={isSaving}>
                  <Save className="w-3 h-3 mr-1" />
                  Save Draft
                </Button>
                <Button size="sm" onClick={() => handleSave('submit')} disabled={isSaving}>
                  <FileCheck className="w-3 h-3 mr-1" />
                  Submit
                </Button>
                {onCancel && (
                  <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSaving}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Form Header Fields */}
            <div className="grid md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Student</Label>
                <Input value={studentName} disabled className="text-sm bg-muted" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Grade</Label>
                <Input
                  value={formData.grade}
                  onChange={(e) => updateField('grade', e.target.value)}
                  placeholder="e.g., 5th"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Reviewer *</Label>
                <Input
                  value={isExternal ? formData.respondentName : formData.reviewer}
                  onChange={(e) => {
                    if (isExternal) {
                      updateField('respondentName', e.target.value);
                    }
                    updateField('reviewer', e.target.value);
                  }}
                  placeholder="Reviewer name"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Date *</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => updateField('date', e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>

            {/* Respondent Information */}
            {!isExternal && (
              <div className="grid md:grid-cols-3 gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <Label className="text-xs">Respondent Type</Label>
                  <Select
                    value={formData.respondentType}
                    onValueChange={(v) => updateField('respondentType', v as BriefRecordReviewData['respondentType'])}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BCBA">BCBA</SelectItem>
                      <SelectItem value="Teacher">Teacher</SelectItem>
                      <SelectItem value="Staff">Staff</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Respondent Name</Label>
                  <Input
                    value={formData.respondentName}
                    onChange={(e) => updateField('respondentName', e.target.value)}
                    placeholder="Name"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Respondent Email (optional)</Label>
                  <Input
                    type="email"
                    value={formData.respondentEmail || ''}
                    onChange={(e) => updateField('respondentEmail', e.target.value)}
                    placeholder="email@example.com"
                    className="text-sm"
                  />
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm text-foreground">
                Put an 'X' in the box indicating records reviewed and document significant information from each.
              </p>
            </div>

            {validationErrors.length > 0 && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                <ul className="text-sm text-destructive list-disc list-inside">
                  {validationErrors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <ScrollArea className="h-[600px]">
          <div className="space-y-4 pr-4">
            {/* Section 1: Health Information */}
            <Collapsible open={expandedSections.has('health')}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-2" onClick={() => toggleSection('health')}>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Activity className="w-4 h-4 text-destructive" />
                        Section 1: Health Information
                        {formData.healthReviewed && <Badge variant="secondary" className="text-xs">Reviewed</Badge>}
                      </CardTitle>
                      {expandedSections.has('health') ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="health-reviewed"
                        checked={formData.healthReviewed}
                        onCheckedChange={(checked) => updateField('healthReviewed', !!checked)}
                      />
                      <label htmlFor="health-reviewed" className="text-sm font-medium cursor-pointer">
                        Health Information Reviewed
                      </label>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Relevant Health History:</Label>
                        <Textarea
                          value={formData.healthHistory}
                          onChange={(e) => updateField('healthHistory', e.target.value)}
                          placeholder="Document relevant health history..."
                          rows={2}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Medical Diagnoses:</Label>
                        <Textarea
                          value={formData.medicalDiagnoses}
                          onChange={(e) => updateField('medicalDiagnoses', e.target.value)}
                          placeholder="List medical diagnoses..."
                          rows={2}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Mental Health Diagnoses:</Label>
                        <Textarea
                          value={formData.mentalHealthDiagnoses}
                          onChange={(e) => updateField('mentalHealthDiagnoses', e.target.value)}
                          placeholder="List mental health diagnoses..."
                          rows={2}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Medications:</Label>
                        <Textarea
                          value={formData.medications}
                          onChange={(e) => updateField('medications', e.target.value)}
                          placeholder="List current medications..."
                          rows={2}
                        />
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Section 2: Academic/Benchmark Assessments */}
            <Collapsible open={expandedSections.has('academic')}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-2" onClick={() => toggleSection('academic')}>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-primary" />
                        Section 2: Academic/Benchmark Assessments
                        {formData.academicReviewed && <Badge variant="secondary" className="text-xs">Reviewed</Badge>}
                      </CardTitle>
                      {expandedSections.has('academic') ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="academic-reviewed"
                        checked={formData.academicReviewed}
                        onCheckedChange={(checked) => updateField('academicReviewed', !!checked)}
                      />
                      <label htmlFor="academic-reviewed" className="text-sm font-medium cursor-pointer">
                        Academic/Benchmark Assessments Reviewed
                      </label>
                    </div>
                    
                    {/* Current Year */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Current Year</Label>
                        <Button variant="ghost" size="sm" onClick={() => addAcademicRow('Current')}>
                          <Plus className="w-3 h-3 mr-1" />
                          Add Row
                        </Button>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Grade/Year</TableHead>
                            <TableHead className="text-xs">Assessment</TableHead>
                            <TableHead className="text-xs">BOY</TableHead>
                            <TableHead className="text-xs">MOY</TableHead>
                            <TableHead className="text-xs">EOY</TableHead>
                            <TableHead className="text-xs w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentAcademic.map(row => (
                            <TableRow key={row.id}>
                              <TableCell>
                                <Input
                                  value={row.gradeYear}
                                  onChange={(e) => updateAcademicRow(row.id, 'gradeYear', e.target.value)}
                                  className="text-xs h-8"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.assessment}
                                  onChange={(e) => updateAcademicRow(row.id, 'assessment', e.target.value)}
                                  className="text-xs h-8"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.boy}
                                  onChange={(e) => updateAcademicRow(row.id, 'boy', e.target.value)}
                                  className="text-xs h-8"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.moy}
                                  onChange={(e) => updateAcademicRow(row.id, 'moy', e.target.value)}
                                  className="text-xs h-8"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.eoy}
                                  onChange={(e) => updateAcademicRow(row.id, 'eoy', e.target.value)}
                                  className="text-xs h-8"
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => removeAcademicRow(row.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          {currentAcademic.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-4">
                                No current year records. Click "Add Row" to add.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Previous Year */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Previous Year(s)</Label>
                        <Button variant="ghost" size="sm" onClick={() => addAcademicRow('Previous')}>
                          <Plus className="w-3 h-3 mr-1" />
                          Add Row
                        </Button>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Grade/Year</TableHead>
                            <TableHead className="text-xs">Assessment</TableHead>
                            <TableHead className="text-xs">BOY</TableHead>
                            <TableHead className="text-xs">MOY</TableHead>
                            <TableHead className="text-xs">EOY</TableHead>
                            <TableHead className="text-xs w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previousAcademic.map(row => (
                            <TableRow key={row.id}>
                              <TableCell>
                                <Input
                                  value={row.gradeYear}
                                  onChange={(e) => updateAcademicRow(row.id, 'gradeYear', e.target.value)}
                                  className="text-xs h-8"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.assessment}
                                  onChange={(e) => updateAcademicRow(row.id, 'assessment', e.target.value)}
                                  className="text-xs h-8"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.boy}
                                  onChange={(e) => updateAcademicRow(row.id, 'boy', e.target.value)}
                                  className="text-xs h-8"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.moy}
                                  onChange={(e) => updateAcademicRow(row.id, 'moy', e.target.value)}
                                  className="text-xs h-8"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.eoy}
                                  onChange={(e) => updateAcademicRow(row.id, 'eoy', e.target.value)}
                                  className="text-xs h-8"
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => removeAcademicRow(row.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          {previousAcademic.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-4">
                                No previous year records. Click "Add Row" to add.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Section 3: Previous Interventions */}
            <Collapsible open={expandedSections.has('interventions')}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-2" onClick={() => toggleSection('interventions')}>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText className="w-4 h-4 text-accent-foreground" />
                        Section 3: Previous Interventions
                        {formData.interventionsReviewed && <Badge variant="secondary" className="text-xs">Reviewed</Badge>}
                      </CardTitle>
                      {expandedSections.has('interventions') ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="interventions-reviewed"
                        checked={formData.interventionsReviewed}
                        onCheckedChange={(checked) => updateField('interventionsReviewed', !!checked)}
                      />
                      <label htmlFor="interventions-reviewed" className="text-sm font-medium cursor-pointer">
                        Previous Interventions Reviewed
                      </label>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Behavior Interventions:</Label>
                        <Textarea
                          value={formData.behaviorInterventions}
                          onChange={(e) => updateField('behaviorInterventions', e.target.value)}
                          placeholder="Document previous behavior interventions..."
                          rows={3}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Academic Interventions (if applicable):</Label>
                        <Textarea
                          value={formData.academicInterventions}
                          onChange={(e) => updateField('academicInterventions', e.target.value)}
                          placeholder="Document academic interventions if applicable..."
                          rows={2}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Previous FBA/BIP:</Label>
                        <Textarea
                          value={formData.previousFBABIP}
                          onChange={(e) => updateField('previousFBABIP', e.target.value)}
                          placeholder="Document previous FBA/BIP information..."
                          rows={3}
                        />
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Section 4: Attendance */}
            <Collapsible open={expandedSections.has('attendance')}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-2" onClick={() => toggleSection('attendance')}>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Clock className="w-4 h-4 text-secondary-foreground" />
                        Section 4: Attendance
                        {formData.attendanceReviewed && <Badge variant="secondary" className="text-xs">Reviewed</Badge>}
                      </CardTitle>
                      {expandedSections.has('attendance') ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="attendance-reviewed"
                        checked={formData.attendanceReviewed}
                        onCheckedChange={(checked) => updateField('attendanceReviewed', !!checked)}
                      />
                      <label htmlFor="attendance-reviewed" className="text-sm font-medium cursor-pointer">
                        Attendance Reviewed
                      </label>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Previous attendance concerns:</Label>
                        <RadioGroup
                          value={formData.previousAttendanceConcerns}
                          onValueChange={(v) => updateField('previousAttendanceConcerns', v as 'No' | 'Yes')}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="No" id="attendance-no" />
                            <Label htmlFor="attendance-no" className="text-sm cursor-pointer">No</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Yes" id="attendance-yes" />
                            <Label htmlFor="attendance-yes" className="text-sm cursor-pointer">Yes</Label>
                          </div>
                        </RadioGroup>
                      </div>
                      <div className="grid md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Tardy:</Label>
                          <Input
                            value={formData.tardy}
                            onChange={(e) => updateField('tardy', e.target.value)}
                            placeholder="e.g., 5 times"
                            className="text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Early dismissal:</Label>
                          <Input
                            value={formData.earlyDismissal}
                            onChange={(e) => updateField('earlyDismissal', e.target.value)}
                            placeholder="e.g., 2 times"
                            className="text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Absent:</Label>
                          <Input
                            value={formData.absent}
                            onChange={(e) => updateField('absent', e.target.value)}
                            placeholder="e.g., 3 days"
                            className="text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Section 5: Discipline */}
            <Collapsible open={expandedSections.has('discipline')}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-2" onClick={() => toggleSection('discipline')}>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                        Section 5: Discipline
                        {formData.disciplineReviewed && <Badge variant="secondary" className="text-xs">Reviewed</Badge>}
                      </CardTitle>
                      {expandedSections.has('discipline') ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="discipline-reviewed"
                        checked={formData.disciplineReviewed}
                        onCheckedChange={(checked) => updateField('disciplineReviewed', !!checked)}
                      />
                      <label htmlFor="discipline-reviewed" className="text-sm font-medium cursor-pointer">
                        Discipline Reviewed
                      </label>
                    </div>
                    
                    {/* Current Year Discipline */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Current Year</Label>
                        <Button variant="ghost" size="sm" onClick={() => addDisciplineRow('Current')}>
                          <Plus className="w-3 h-3 mr-1" />
                          Add Row
                        </Button>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Grade/Year</TableHead>
                            <TableHead className="text-xs"># of Referrals</TableHead>
                            <TableHead className="text-xs">Frequent Infractions</TableHead>
                            <TableHead className="text-xs">Notes</TableHead>
                            <TableHead className="text-xs w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentDiscipline.map(row => (
                            <TableRow key={row.id}>
                              <TableCell>
                                <Input
                                  value={row.gradeYear}
                                  onChange={(e) => updateDisciplineRow(row.id, 'gradeYear', e.target.value)}
                                  className="text-xs h-8"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.numReferrals}
                                  onChange={(e) => updateDisciplineRow(row.id, 'numReferrals', e.target.value)}
                                  className="text-xs h-8"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.frequentInfractions}
                                  onChange={(e) => updateDisciplineRow(row.id, 'frequentInfractions', e.target.value)}
                                  className="text-xs h-8"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.notes}
                                  onChange={(e) => updateDisciplineRow(row.id, 'notes', e.target.value)}
                                  className="text-xs h-8"
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => removeDisciplineRow(row.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          {currentDiscipline.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-4">
                                No current year records. Click "Add Row" to add.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Previous Year Discipline */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Previous Year(s)</Label>
                        <Button variant="ghost" size="sm" onClick={() => addDisciplineRow('Previous')}>
                          <Plus className="w-3 h-3 mr-1" />
                          Add Row
                        </Button>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Grade/Year</TableHead>
                            <TableHead className="text-xs"># of Referrals</TableHead>
                            <TableHead className="text-xs">Frequent Infractions</TableHead>
                            <TableHead className="text-xs">Notes</TableHead>
                            <TableHead className="text-xs w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previousDiscipline.map(row => (
                            <TableRow key={row.id}>
                              <TableCell>
                                <Input
                                  value={row.gradeYear}
                                  onChange={(e) => updateDisciplineRow(row.id, 'gradeYear', e.target.value)}
                                  className="text-xs h-8"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.numReferrals}
                                  onChange={(e) => updateDisciplineRow(row.id, 'numReferrals', e.target.value)}
                                  className="text-xs h-8"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.frequentInfractions}
                                  onChange={(e) => updateDisciplineRow(row.id, 'frequentInfractions', e.target.value)}
                                  className="text-xs h-8"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.notes}
                                  onChange={(e) => updateDisciplineRow(row.id, 'notes', e.target.value)}
                                  className="text-xs h-8"
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => removeDisciplineRow(row.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          {previousDiscipline.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-4">
                                No previous year records. Click "Add Row" to add.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Notes:</Label>
                      <Textarea
                        value={formData.disciplineNotes}
                        onChange={(e) => updateField('disciplineNotes', e.target.value)}
                        placeholder="Additional discipline notes..."
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Section 6: IEP Review */}
            <Collapsible open={expandedSections.has('iep')}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-2" onClick={() => toggleSection('iep')}>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" />
                        Section 6: IEP Review
                        {formData.iepReviewed && <Badge variant="secondary" className="text-xs">Reviewed</Badge>}
                      </CardTitle>
                      {expandedSections.has('iep') ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="iep-reviewed"
                        checked={formData.iepReviewed}
                        onCheckedChange={(checked) => updateField('iepReviewed', !!checked)}
                      />
                      <label htmlFor="iep-reviewed" className="text-sm font-medium cursor-pointer">
                        IEP Review Completed
                      </label>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Area of eligibility/disability:</Label>
                        <Textarea
                          value={formData.eligibilityDisability}
                          onChange={(e) => updateField('eligibilityDisability', e.target.value)}
                          placeholder="Document eligibility/disability areas..."
                          rows={2}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Services:</Label>
                        <Textarea
                          value={formData.services}
                          onChange={(e) => updateField('services', e.target.value)}
                          placeholder="Document IEP services..."
                          rows={2}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Program Modification/Testing Accommodations:</Label>
                        <Textarea
                          value={formData.programModifications}
                          onChange={(e) => updateField('programModifications', e.target.value)}
                          placeholder="Document modifications and accommodations..."
                          rows={2}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Other Information:</Label>
                        <Textarea
                          value={formData.otherInformation}
                          onChange={(e) => updateField('otherInformation', e.target.value)}
                          placeholder="Any other relevant IEP information..."
                          rows={2}
                        />
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>
        </ScrollArea>
      </div>
    </AssessmentErrorBoundary>
  );
}
