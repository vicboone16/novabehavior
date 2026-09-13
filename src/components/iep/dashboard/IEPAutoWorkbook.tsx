import { useState } from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useDataStore } from '@/store/dataStore';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function IEPAutoWorkbook() {
  const { students, behaviorGoals, frequencyEntries } = useDataStore();
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  const handleGenerate = async () => {
    if (!selectedStudentId || !selectedStudent) {
      toast.error('Please select a student');
      return;
    }
    setIsGenerating(true);
    try {
      const goals = behaviorGoals.filter((g) => g.studentId === selectedStudentId);
      const behaviors = selectedStudent.behaviors.filter((b) => !b.isArchived);
      const today = format(new Date(), 'MMMM d, yyyy');

      // Compute last 30-day frequency totals per behavior
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const recentFreq = frequencyEntries.filter(
        (e) => e.studentId === selectedStudentId && new Date(e.timestamp).getTime() >= cutoff
      );
      const freqByBehavior = new Map<string, number>();
      for (const e of recentFreq) {
        freqByBehavior.set(e.behaviorId, (freqByBehavior.get(e.behaviorId) ?? 0) + (e.count ?? 1));
      }

      const skillTargets = selectedStudent.skillTargets ?? [];
      const assessments = selectedStudent.indirectAssessments ?? [];

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>IEP Workbook — ${selectedStudent.name}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11pt; color: #111; max-width: 850px; margin: 0 auto; padding: 32px; }
  h1 { font-size: 18pt; border-bottom: 2px solid #333; padding-bottom: 6px; }
  h2 { font-size: 13pt; margin-top: 28px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
  h3 { font-size: 11pt; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
  th { background: #f0f0f0; font-weight: bold; }
  .meta { color: #555; font-size: 9.5pt; margin-bottom: 4px; }
  .badge { display: inline-block; background: #e8f0fe; color: #2563eb; border-radius: 4px; padding: 2px 8px; font-size: 9pt; margin-right: 4px; }
  .section { margin-top: 20px; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
<h1>IEP Workbook — ${selectedStudent.name}</h1>
<p class="meta">Generated: ${today} &nbsp;|&nbsp; Nova Behavior</p>

<h2>Student Information</h2>
<table>
  <tr><th>Name</th><td>${selectedStudent.name}</td></tr>
  ${selectedStudent.dateOfBirth ? `<tr><th>Date of Birth</th><td>${format(new Date(selectedStudent.dateOfBirth), 'MMMM d, yyyy')}</td></tr>` : ''}
  ${selectedStudent.grade ? `<tr><th>Grade</th><td>${selectedStudent.grade}</td></tr>` : ''}
  ${selectedStudent.school ? `<tr><th>School</th><td>${selectedStudent.school}</td></tr>` : ''}
  ${selectedStudent.diagnoses?.length ? `<tr><th>Diagnoses</th><td>${(selectedStudent.diagnoses as string[]).join(', ')}</td></tr>` : ''}
  ${selectedStudent.primarySetting ? `<tr><th>Primary Setting</th><td>${selectedStudent.primarySetting}</td></tr>` : ''}
</table>

${goals.length > 0 ? `
<h2>IEP Goals (${goals.length})</h2>
${goals.map((g) => `
<div class="section">
  <h3>${g.behaviorName ?? 'Goal'} — <em>${g.goalDescription ?? ''}</em></h3>
  <p class="meta">Baseline: ${g.baselineValue ?? '—'} &nbsp;|&nbsp; Target: ${g.targetValue ?? '—'} &nbsp;|&nbsp; Mastery: ${g.masteryPercentage ?? '—'}%</p>
</div>`).join('')}
` : ''}

${behaviors.length > 0 ? `
<h2>Target Behaviors (${behaviors.length})</h2>
<table>
  <tr><th>Behavior</th><th>Methods</th><th>Occurrences (last 30 days)</th><th>Operational Definition</th></tr>
  ${behaviors.map((b) => `
  <tr>
    <td>${b.name}</td>
    <td>${b.methods.join(', ')}</td>
    <td>${freqByBehavior.get(b.id) ?? 0}</td>
    <td>${b.operationalDefinition ?? '—'}</td>
  </tr>`).join('')}
</table>
` : ''}

${skillTargets.length > 0 ? `
<h2>Skill Acquisition Targets (${skillTargets.length})</h2>
<table>
  <tr><th>Target</th><th>Domain</th><th>Method</th><th>Status</th><th>Mastery Criteria</th></tr>
  ${skillTargets.map((t) => `
  <tr>
    <td>${t.name}</td>
    <td>${t.domain ?? '—'}</td>
    <td>${t.method}</td>
    <td>${t.status}</td>
    <td>${t.masteryCriteria ? `${t.masteryCriteria.percentCorrect ?? '—'}% correct, ${t.masteryCriteria.consecutiveSessions ?? '—'} sessions` : '—'}</td>
  </tr>`).join('')}
</table>
` : ''}

${assessments.length > 0 ? `
<h2>Assessment Results (${assessments.length})</h2>
<table>
  <tr><th>Assessment</th><th>Completed</th><th>Summary</th></tr>
  ${assessments.map((a: any) => `
  <tr>
    <td>${a.assessmentName ?? a.type ?? '—'}</td>
    <td>${a.completedAt ? format(new Date(a.completedAt), 'MM/dd/yyyy') : '—'}</td>
    <td>${a.summary ?? a.notes ?? '—'}</td>
  </tr>`).join('')}
</table>
` : ''}

<h2>Service Minutes</h2>
<p class="meta">Service authorization data is tracked in the Billing / Authorizations section of Nova Behavior and can be attached separately.</p>

<h2>Accommodations</h2>
<p class="meta">${selectedStudent.narrativeNotes?.length ? 'See narrative notes below.' : 'No accommodations on record. Add them in the student profile.'}</p>

${selectedStudent.narrativeNotes?.length ? `
<h2>Progress Notes (${selectedStudent.narrativeNotes.length})</h2>
${selectedStudent.narrativeNotes.slice(-5).map((n: any) => `
<div class="section">
  <p class="meta">${n.timestamp ? format(new Date(n.timestamp), 'MM/dd/yyyy') : ''} — ${n.author ?? ''}</p>
  <p>${n.text ?? n.content ?? ''}</p>
</div>`).join('')}
` : ''}

</body>
</html>`;

      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `IEP_Workbook_${selectedStudent.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('IEP workbook downloaded — open in any browser or print to PDF');
    } catch (err) {
      console.error('[IEPWorkbook] Generation failed:', err);
      toast.error('Failed to generate workbook');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Auto IEP Workbook Generator
          </CardTitle>
          <CardDescription>
            Generate an auto-populated IEP workbook that pulls student data, goals, assessments, and service records
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Select Student</Label>
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a student..." />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedStudent && (
            <Card className="bg-muted/50 border-muted">
              <CardContent className="p-4">
                <p className="text-sm font-medium mb-2">Data that will be included:</p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="text-xs">Student Info</Badge>
                  {behaviorGoals.some((g) => g.studentId === selectedStudentId) && (
                    <Badge variant="secondary" className="text-xs">IEP Goals</Badge>
                  )}
                  {selectedStudent.behaviors.some((b) => !b.isArchived) && (
                    <Badge variant="secondary" className="text-xs">Target Behaviors</Badge>
                  )}
                  {(selectedStudent.skillTargets?.length ?? 0) > 0 && (
                    <Badge variant="secondary" className="text-xs">Skill Targets</Badge>
                  )}
                  {(selectedStudent.indirectAssessments?.length ?? 0) > 0 && (
                    <Badge variant="secondary" className="text-xs">Assessment Results</Badge>
                  )}
                  {(selectedStudent.narrativeNotes?.length ?? 0) > 0 && (
                    <Badge variant="secondary" className="text-xs">Progress Notes</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Button
            onClick={handleGenerate}
            disabled={!selectedStudentId || isGenerating}
            className="w-full gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Generate &amp; Download IEP Workbook
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
