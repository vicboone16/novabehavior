import { useState, useEffect } from 'react';
import {
  Send, Eye, Copy, FileText, Plus, Users,
  CheckCircle2, Clock, AlertCircle, Search
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useClinicalForms, ClinicalFormTemplate } from '@/hooks/useClinicalForms';
import { useDataStore } from '@/store/dataStore';
import { toast } from 'sonner';

export function ClinicalFormsPanel() {
  const { templates, submissions, isLoading, fetchTemplates, fetchSubmissions, createSubmission, copyFormLink } = useClinicalForms();
  const { students } = useDataStore();
  const [activeTab, setActiveTab] = useState('sendable');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ClinicalFormTemplate | null>(null);
  const [sendForm, setSendForm] = useState({
    student_id: '',
    respondent_name: '',
    respondent_email: '',
    respondent_relationship: '',
    send_email: true,
  });

  useEffect(() => {
    fetchTemplates();
    fetchSubmissions();
  }, [fetchTemplates, fetchSubmissions]);

  const categoryTemplates = {
    sendable: templates.filter(t => t.delivery_modes.includes('magic_link')),
    observation: templates.filter(t => t.form_category === 'observation'),
    data_sheet: templates.filter(t => t.form_category === 'data_sheet'),
    assessment: templates.filter(t => t.form_category === 'assessment'),
    iep_dashboard: templates.filter(t => t.form_category === 'iep_dashboard'),
  };

  const handleSend = async () => {
    if (!selectedTemplate) return;
    try {
      const result = await createSubmission({
        templateId: selectedTemplate.id,
        studentId: sendForm.student_id || undefined,
        respondentName: sendForm.respondent_name,
        respondentEmail: sendForm.respondent_email,
        respondentRelationship: sendForm.respondent_relationship,
        sendEmail: sendForm.send_email,
      });
      if (result) {
        setShowSendDialog(false);
        setSendForm({ student_id: '', respondent_name: '', respondent_email: '', respondent_relationship: '', send_email: true });
        fetchSubmissions();
      }
    } catch (err: any) {
      toast.error('Failed to send form: ' + err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted': return <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-300">Submitted</Badge>;
      case 'in_progress': return <Badge className="bg-blue-500/10 text-blue-700 border-blue-300">In Progress</Badge>;
      case 'sent': return <Badge className="bg-amber-500/10 text-amber-700 border-amber-300">Sent</Badge>;
      case 'draft': return <Badge variant="secondary">Draft</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderTemplateList = (templateList: ClinicalFormTemplate[]) => {
    const filtered = templateList.filter(t =>
      !searchQuery || t.form_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (filtered.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>No forms found</p>
        </div>
      );
    }

    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map(template => {
          const templateSubmissions = submissions.filter(s => s.template_id === template.id);
          const sentCount = templateSubmissions.filter(s => s.status === 'sent').length;
          const completedCount = templateSubmissions.filter(s => s.status === 'submitted').length;

          return (
            <Card key={template.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{template.form_name}</p>
                    {template.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{template.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mb-3">
                  {template.delivery_modes.map(mode => (
                    <Badge key={mode} variant="outline" className="text-[10px]">
                      {mode.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    {sentCount > 0 && <span>{sentCount} sent</span>}
                    {completedCount > 0 && <span>{completedCount} completed</span>}
                  </div>
                  <div className="flex gap-1.5">
                    {template.delivery_modes.includes('magic_link') && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => {
                          setSelectedTemplate(template);
                          setShowSendDialog(true);
                        }}
                      >
                        <Send className="w-3 h-3" /> Send
                      </Button>
                    )}
                    {template.delivery_modes.includes('in_app') && (
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                        <Eye className="w-3 h-3" /> Open
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search forms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1 bg-muted/50">
          <TabsTrigger value="sendable" className="text-xs gap-1">
            <Send className="w-3 h-3" /> Sendable ({categoryTemplates.sendable.length})
          </TabsTrigger>
          <TabsTrigger value="observation" className="text-xs gap-1">
            <Eye className="w-3 h-3" /> Observations ({categoryTemplates.observation.length})
          </TabsTrigger>
          <TabsTrigger value="data_sheet" className="text-xs gap-1">
            <FileText className="w-3 h-3" /> Data Sheets ({categoryTemplates.data_sheet.length})
          </TabsTrigger>
          <TabsTrigger value="assessment" className="text-xs gap-1">
            <CheckCircle2 className="w-3 h-3" /> Assessments ({categoryTemplates.assessment.length})
          </TabsTrigger>
          <TabsTrigger value="iep_dashboard" className="text-xs gap-1">
            <FileText className="w-3 h-3" /> IEP Tools ({categoryTemplates.iep_dashboard.length})
          </TabsTrigger>
          <TabsTrigger value="submissions" className="text-xs gap-1">
            <Clock className="w-3 h-3" /> Submissions ({submissions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sendable" className="mt-3">
          {renderTemplateList(categoryTemplates.sendable)}
        </TabsContent>
        <TabsContent value="observation" className="mt-3">
          {renderTemplateList(categoryTemplates.observation)}
        </TabsContent>
        <TabsContent value="data_sheet" className="mt-3">
          {renderTemplateList(categoryTemplates.data_sheet)}
        </TabsContent>
        <TabsContent value="assessment" className="mt-3">
          {renderTemplateList(categoryTemplates.assessment)}
        </TabsContent>
        <TabsContent value="iep_dashboard" className="mt-3">
          {renderTemplateList(categoryTemplates.iep_dashboard)}
        </TabsContent>
        <TabsContent value="submissions" className="mt-3">
          {submissions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>No submissions yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {submissions.map(sub => {
                const student = students.find(s => s.id === sub.student_id);
                return (
                  <Card key={sub.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {sub.template?.form_name || 'Form'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {student?.name && `${student.name} · `}
                            {sub.respondent_name && `${sub.respondent_name} · `}
                            {new Date(sub.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {getStatusBadge(sub.status)}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => copyFormLink(sub.access_token)}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Send Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send: {selectedTemplate?.form_name}</DialogTitle>
            <DialogDescription>
              Send this form to a teacher, parent, or staff member via email
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Student (optional)</Label>
              <Select value={sendForm.student_id} onValueChange={v => setSendForm(p => ({ ...p, student_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select student..." /></SelectTrigger>
                <SelectContent>
                  {students.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
    </div>
  );
}
