import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  FileText, Calendar, Users, History, Home, AlertCircle,
  Save, ChevronDown, ChevronUp, Edit2, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Student, StudentBackgroundInfo } from '@/types/behavior';
import { toast } from 'sonner';

interface StudentBackgroundEditorProps {
  student: Student;
  onUpdate: (updates: Partial<Student>) => void;
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  hasContent?: boolean;
}

function Section({ title, icon, children, defaultOpen = false, hasContent = false }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg cursor-pointer">
          <div className="flex items-center gap-2">
            {icon}
            <span className="font-medium text-sm">{title}</span>
            {hasContent && (
              <Badge variant="secondary" className="text-xs">Has info</Badge>
            )}
          </div>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function StudentBackgroundEditor({ student, onUpdate }: StudentBackgroundEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [backgroundInfo, setBackgroundInfo] = useState<StudentBackgroundInfo>(
    student.backgroundInfo || {}
  );

  // Reset form when student changes
  useEffect(() => {
    setBackgroundInfo(student.backgroundInfo || {});
    setIsEditing(false);
  }, [student.id, student.backgroundInfo]);

  const updateField = (field: keyof StudentBackgroundInfo, value: string | Date | undefined) => {
    setBackgroundInfo(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    onUpdate({
      backgroundInfo: {
        ...backgroundInfo,
        updatedAt: new Date(),
      }
    });
    setIsEditing(false);
    toast.success('Background information saved');
  };

  const handleCancel = () => {
    setBackgroundInfo(student.backgroundInfo || {});
    setIsEditing(false);
  };

  // Check if sections have content
  const hasReferral = !!(backgroundInfo.referralReason || backgroundInfo.referralSource || 
    backgroundInfo.referralDate || backgroundInfo.presentingConcerns);
  const hasHistory = !!(backgroundInfo.educationalHistory || backgroundInfo.previousPlacements || 
    backgroundInfo.diagnoses || backgroundInfo.medicalInfo);
  const hasInterventions = !!(backgroundInfo.previousBIPs || backgroundInfo.strategiesTried || 
    backgroundInfo.whatWorked || backgroundInfo.whatDidntWork);
  const hasFamily = !!(backgroundInfo.homeEnvironment || backgroundInfo.familyStructure || 
    backgroundInfo.culturalConsiderations);
  const hasBehaviors = !!backgroundInfo.behaviorsOfConcernSummary;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Background Information
          </CardTitle>
          {!isEditing ? (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              <Edit2 className="w-4 h-4 mr-1" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="w-4 h-4 mr-1" />
                Save
              </Button>
            </div>
          )}
        </div>
        <CardDescription className="text-xs">
          Information entered here will be pulled into FBA and BIP reports
          {backgroundInfo.updatedAt && (
            <> • Last updated: {format(new Date(backgroundInfo.updatedAt), 'MMM d, yyyy')}</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Referral Information */}
        <Section 
          title="Referral Information" 
          icon={<Calendar className="w-4 h-4 text-primary" />}
          hasContent={hasReferral}
          defaultOpen={isEditing && !hasReferral}
        >
          <div className="space-y-3 mt-2">
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Referral Source</Label>
                {isEditing ? (
                  <Input
                    value={backgroundInfo.referralSource || ''}
                    onChange={(e) => updateField('referralSource', e.target.value)}
                    placeholder="e.g., Teacher, Parent, Administrator"
                  />
                ) : (
                  <p className="text-sm">{backgroundInfo.referralSource || <span className="text-muted-foreground">Not specified</span>}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Referral Date</Label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={backgroundInfo.referralDate ? format(new Date(backgroundInfo.referralDate), 'yyyy-MM-dd') : ''}
                    onChange={(e) => updateField('referralDate', e.target.value ? new Date(e.target.value) : undefined)}
                  />
                ) : (
                  <p className="text-sm">
                    {backgroundInfo.referralDate 
                      ? format(new Date(backgroundInfo.referralDate), 'MMM d, yyyy')
                      : <span className="text-muted-foreground">Not specified</span>}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Referral Reason</Label>
              {isEditing ? (
                <Textarea
                  value={backgroundInfo.referralReason || ''}
                  onChange={(e) => updateField('referralReason', e.target.value)}
                  placeholder="Why was the student referred for assessment?"
                  rows={2}
                />
              ) : (
                <p className="text-sm">{backgroundInfo.referralReason || <span className="text-muted-foreground">Not specified</span>}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Presenting Concerns</Label>
              {isEditing ? (
                <Textarea
                  value={backgroundInfo.presentingConcerns || ''}
                  onChange={(e) => updateField('presentingConcerns', e.target.value)}
                  placeholder="Primary concerns from referral source"
                  rows={2}
                />
              ) : (
                <p className="text-sm">{backgroundInfo.presentingConcerns || <span className="text-muted-foreground">Not specified</span>}</p>
              )}
            </div>
          </div>
        </Section>

        <Separator />

        {/* Student History */}
        <Section 
          title="Student History" 
          icon={<History className="w-4 h-4 text-primary/80" />}
          hasContent={hasHistory}
        >
          <div className="space-y-3 mt-2">
            <div className="space-y-1">
              <Label className="text-xs">Educational History</Label>
              {isEditing ? (
                <Textarea
                  value={backgroundInfo.educationalHistory || ''}
                  onChange={(e) => updateField('educationalHistory', e.target.value)}
                  placeholder="Schools attended, grade retention, academic performance"
                  rows={2}
                />
              ) : (
                <p className="text-sm">{backgroundInfo.educationalHistory || <span className="text-muted-foreground">Not specified</span>}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Previous Placements</Label>
              {isEditing ? (
                <Textarea
                  value={backgroundInfo.previousPlacements || ''}
                  onChange={(e) => updateField('previousPlacements', e.target.value)}
                  placeholder="Special education placements, alternative schools, etc."
                  rows={2}
                />
              ) : (
                <p className="text-sm">{backgroundInfo.previousPlacements || <span className="text-muted-foreground">Not specified</span>}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Relevant Diagnoses</Label>
              {isEditing ? (
                <Textarea
                  value={backgroundInfo.diagnoses || ''}
                  onChange={(e) => updateField('diagnoses', e.target.value)}
                  placeholder="ADHD, ASD, learning disabilities, etc."
                  rows={2}
                />
              ) : (
                <p className="text-sm">{backgroundInfo.diagnoses || <span className="text-muted-foreground">Not specified</span>}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Medical Information</Label>
              {isEditing ? (
                <Textarea
                  value={backgroundInfo.medicalInfo || ''}
                  onChange={(e) => updateField('medicalInfo', e.target.value)}
                  placeholder="Relevant medical history, medications, sensory needs"
                  rows={2}
                />
              ) : (
                <p className="text-sm">{backgroundInfo.medicalInfo || <span className="text-muted-foreground">Not specified</span>}</p>
              )}
            </div>
          </div>
        </Section>

        <Separator />

        {/* Previous Interventions */}
        <Section 
          title="Previous Interventions" 
          icon={<Users className="w-4 h-4 text-primary/70" />}
          hasContent={hasInterventions}
        >
          <div className="space-y-3 mt-2">
            <div className="space-y-1">
              <Label className="text-xs">Previous BIPs</Label>
              {isEditing ? (
                <Textarea
                  value={backgroundInfo.previousBIPs || ''}
                  onChange={(e) => updateField('previousBIPs', e.target.value)}
                  placeholder="Summary of previous behavior intervention plans"
                  rows={2}
                />
              ) : (
                <p className="text-sm">{backgroundInfo.previousBIPs || <span className="text-muted-foreground">Not specified</span>}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Strategies Tried</Label>
              {isEditing ? (
                <Textarea
                  value={backgroundInfo.strategiesTried || ''}
                  onChange={(e) => updateField('strategiesTried', e.target.value)}
                  placeholder="List of interventions and strategies previously attempted"
                  rows={2}
                />
              ) : (
                <p className="text-sm">{backgroundInfo.strategiesTried || <span className="text-muted-foreground">Not specified</span>}</p>
              )}
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">What Worked</Label>
                {isEditing ? (
                  <Textarea
                    value={backgroundInfo.whatWorked || ''}
                    onChange={(e) => updateField('whatWorked', e.target.value)}
                    placeholder="Effective strategies"
                    rows={2}
                  />
                ) : (
                  <p className="text-sm">{backgroundInfo.whatWorked || <span className="text-muted-foreground">Not specified</span>}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">What Didn't Work</Label>
                {isEditing ? (
                  <Textarea
                    value={backgroundInfo.whatDidntWork || ''}
                    onChange={(e) => updateField('whatDidntWork', e.target.value)}
                    placeholder="Ineffective strategies"
                    rows={2}
                  />
                ) : (
                  <p className="text-sm">{backgroundInfo.whatDidntWork || <span className="text-muted-foreground">Not specified</span>}</p>
                )}
              </div>
            </div>
          </div>
        </Section>

        <Separator />

        {/* Family/Home Context */}
        <Section 
          title="Family/Home Context" 
          icon={<Home className="w-4 h-4 text-primary/60" />}
          hasContent={hasFamily}
        >
          <div className="space-y-3 mt-2">
            <div className="space-y-1">
              <Label className="text-xs">Home Environment</Label>
              {isEditing ? (
                <Textarea
                  value={backgroundInfo.homeEnvironment || ''}
                  onChange={(e) => updateField('homeEnvironment', e.target.value)}
                  placeholder="Relevant home environment factors"
                  rows={2}
                />
              ) : (
                <p className="text-sm">{backgroundInfo.homeEnvironment || <span className="text-muted-foreground">Not specified</span>}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Family Structure</Label>
              {isEditing ? (
                <Textarea
                  value={backgroundInfo.familyStructure || ''}
                  onChange={(e) => updateField('familyStructure', e.target.value)}
                  placeholder="Family composition, caregivers, siblings"
                  rows={2}
                />
              ) : (
                <p className="text-sm">{backgroundInfo.familyStructure || <span className="text-muted-foreground">Not specified</span>}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cultural Considerations</Label>
              {isEditing ? (
                <Textarea
                  value={backgroundInfo.culturalConsiderations || ''}
                  onChange={(e) => updateField('culturalConsiderations', e.target.value)}
                  placeholder="Cultural, linguistic, or religious considerations"
                  rows={2}
                />
              ) : (
                <p className="text-sm">{backgroundInfo.culturalConsiderations || <span className="text-muted-foreground">Not specified</span>}</p>
              )}
            </div>
          </div>
        </Section>

        <Separator />

        {/* Behaviors of Concern */}
        <Section 
          title="Behaviors of Concern Summary" 
          icon={<AlertCircle className="w-4 h-4 text-destructive" />}
          hasContent={hasBehaviors}
        >
          <div className="space-y-3 mt-2">
            <div className="space-y-1">
              <Label className="text-xs">Summary for Reports</Label>
              {isEditing ? (
                <Textarea
                  value={backgroundInfo.behaviorsOfConcernSummary || ''}
                  onChange={(e) => updateField('behaviorsOfConcernSummary', e.target.value)}
                  placeholder="Narrative summary of target behaviors for reports. This supplements the operational definitions."
                  rows={4}
                />
              ) : (
                <p className="text-sm">{backgroundInfo.behaviorsOfConcernSummary || <span className="text-muted-foreground">Not specified</span>}</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              This narrative description will be included in the Background section of FBA reports, 
              alongside the formal operational definitions from your behavior list.
            </p>
          </div>
        </Section>
      </CardContent>
    </Card>
  );
}