import { useState, useEffect } from 'react';
import { Send, Copy, Eye, Clock, CheckCircle2, FileText, Plus, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useClinicalForms, ClinicalFormTemplate } from '@/hooks/useClinicalForms';
import { toast } from 'sonner';

interface StudentClinicalFormsProps {
  studentId: string;
  studentName: string;
}

export function StudentClinicalForms({ studentId, studentName }: StudentClinicalFormsProps) {
  const { templates, submissions, fetchTemplates, fetchSubmissions, createSubmission, copyFormLink } = useClinicalForms();
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ClinicalFormTemplate | null>(null);
  const [sendForm, setSendForm] = useState({ respondent_name: '', respondent_email: '', respondent_relationship: '' });

  useEffect(() => {
    fetchTemplates();
    fetchSubmissions(undefined, studentId);
  }, [fetchTemplates, fetchSubmissions, studentId]);

  const studentSubmissions = submissions.filter(s => s.student_id === studentId);

  const handleSend = async () => {
    if (!selectedTemplate) return;
    try {
      await createSubmission({
        templateId: selectedTemplate.id,
        studentId,
        respondentName: sendForm.respondent_name,
        respondentEmail: sendForm.respondent_email,
        respondentRelationship: sendForm.respondent_relationship,
        sendEmail: !!sendForm.respondent_email,
      });
      setShowSendDialog(false);
      setSendForm({ respondent_name: '', respondent_email: '', respondent_relationship: '' });
      fetchSubmissions(undefined, studentId);
    } catch (err: any) {
      toast.error('Failed to send form');
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'submitted': return <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-300 text-[10px]">Submitted</Badge>;
      case 'in_progress': return <Badge className="bg-blue-500/10 text-blue-700 border-blue-300 text-[10px]">In Progress</Badge>;
      case 'sent': return <Badge className="bg-amber-500/10 text-amber-700 border-amber-300 text-[10px]">Sent</Badge>;
      default: return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  // Show ALL templates — sendable via magic link, in-app, or exportable
  const allTemplates = templates;

  return (
    <Collapsible defaultOpen={studentSubmissions.length > 0}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Clinical Forms
              <Badge variant="secondary" className="ml-auto">{studentSubmissions.length}</Badge>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            {/* Assign New Form */}
            <Select onValueChange={id => {
              const t = templates.find(t => t.id === id);
              if (t) { setSelectedTemplate(t); setShowSendDialog(true); }
            }}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Assign a form..." />
              </SelectTrigger>
              <SelectContent>
                {allTemplates.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.form_name}
                    {t.form_category !== 'sendable' ? ` (${t.form_category.replace('_', ' ')})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Existing submissions */}
            {studentSubmissions.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">No forms assigned yet</p>
            ) : (
              <div className="space-y-2">
                {studentSubmissions.map(sub => (
                  <div key={sub.id} className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border/50 bg-muted/30">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{sub.template?.form_name || 'Form'}</p>
                      <p className="text-xs text-muted-foreground">
                        {sub.respondent_name && `${sub.respondent_name} · `}
                        {new Date(sub.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {statusBadge(sub.status)}
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => copyFormLink(sub.access_token)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                      {sub.status === 'submitted' && (
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                          <Eye className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>

      {/* Send Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send: {selectedTemplate?.form_name}</DialogTitle>
            <DialogDescription>Assign this form for {studentName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Recipient Name</Label>
              <Input value={sendForm.respondent_name} onChange={e => setSendForm(p => ({ ...p, respondent_name: e.target.value }))} placeholder="e.g., Mrs. Johnson" />
            </div>
            <div>
              <Label>Recipient Email</Label>
              <Input type="email" value={sendForm.respondent_email} onChange={e => setSendForm(p => ({ ...p, respondent_email: e.target.value }))} placeholder="email@school.edu" />
            </div>
            <div>
              <Label>Relationship</Label>
              <Select value={sendForm.respondent_relationship} onValueChange={v => setSendForm(p => ({ ...p, respondent_relationship: v }))}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="parent">Parent/Guardian</SelectItem>
                  <SelectItem value="aide">Aide/Paraprofessional</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="related_service">Related Service Provider</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSend} className="w-full gap-2">
              <Send className="w-4 h-4" /> Send Form
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Collapsible>
  );
}
