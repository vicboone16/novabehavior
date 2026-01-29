import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  Send, Plus, FileText, Clock, CheckCircle, AlertCircle,
  Mail, User, Trash2, Eye, ExternalLink, Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { QuestionnaireBuilder } from './QuestionnaireBuilder';
import { ResponseViewer } from './ResponseViewer';

interface Template {
  id: string;
  name: string;
  description: string | null;
  questions: unknown[];
  created_at: string;
}

interface Invitation {
  id: string;
  template_id: string;
  recipient_name: string;
  recipient_email: string;
  recipient_type: string;
  status: string;
  sent_at: string | null;
  expires_at: string;
  completed_at: string | null;
  access_token: string;
}

interface QuestionnaireManagerProps {
  studentId: string;
  studentName: string;
}

export function QuestionnaireManager({ studentId, studentName }: QuestionnaireManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientType, setRecipientType] = useState<string>('teacher');
  const [isSending, setIsSending] = useState(false);
  const [selectedInvitationId, setSelectedInvitationId] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load templates
      const { data: templatesData } = await supabase
        .from('questionnaire_templates')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (templatesData) {
        setTemplates(templatesData as Template[]);
      }

      // Load invitations for this student
      const { data: invitationsData } = await supabase
        .from('questionnaire_invitations')
        .select('*')
        .eq('student_id', studentId)
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false });

      if (invitationsData) {
        setInvitations(invitationsData as Invitation[]);
      }
    } catch (error) {
      console.error('Error loading questionnaire data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && studentId) {
      loadData();
    }
  }, [user, studentId]);

  const handleSendQuestionnaire = async () => {
    if (!selectedTemplateId || !recipientName.trim() || !recipientEmail.trim()) {
      toast({
        title: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);

    try {
      // Create invitation
      const { data: invitation, error } = await supabase
        .from('questionnaire_invitations')
        .insert({
          template_id: selectedTemplateId,
          student_id: studentId,
          recipient_name: recipientName.trim(),
          recipient_email: recipientEmail.trim(),
          recipient_type: recipientType,
          created_by: user?.id,
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // TODO: Send email via edge function when RESEND_API_KEY is configured
      // For now, we'll just show a link that can be copied

      toast({
        title: 'Questionnaire Created!',
        description: 'Copy the link to share with the recipient.',
      });

      setShowSendDialog(false);
      setSelectedTemplateId('');
      setRecipientName('');
      setRecipientEmail('');
      setRecipientType('teacher');
      loadData();
    } catch (error) {
      console.error('Error sending questionnaire:', error);
      toast({
        title: 'Failed to create questionnaire',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/questionnaire/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copied to clipboard!' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500 text-primary-foreground"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'expired':
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />Expired</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Questionnaires</h3>
          <p className="text-sm text-muted-foreground">
            Send questionnaires to teachers, parents, and caregivers
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowBuilder(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Template
          </Button>
          <Button onClick={() => setShowSendDialog(true)} disabled={templates.length === 0}>
            <Send className="w-4 h-4 mr-2" />
            Send Questionnaire
          </Button>
        </div>
      </div>

      {/* Sent Questionnaires */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sent Questionnaires</CardTitle>
          <CardDescription>
            Track questionnaires sent for {studentName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No questionnaires sent yet</p>
              <p className="text-xs mt-1">Send one to collect information from collaborators</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => {
                  const template = templates.find(t => t.id === inv.template_id);
                  return (
                    <TableRow key={inv.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{inv.recipient_name}</p>
                            <p className="text-xs text-muted-foreground">{inv.recipient_email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-xs">
                          {inv.recipient_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{template?.name || 'Unknown'}</TableCell>
                      <TableCell>{getStatusBadge(inv.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {inv.sent_at ? format(new Date(inv.sent_at), 'MMM d, yyyy') : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {inv.status === 'completed' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedInvitationId(inv.id)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          {inv.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyLink(inv.access_token)}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Templates List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Templates</CardTitle>
          <CardDescription>
            Reusable questionnaire templates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No templates yet</p>
              <Button variant="link" onClick={() => setShowBuilder(true)}>
                Create your first template
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{template.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(template.questions as unknown[]).length} questions
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTemplateId(template.id);
                        setShowSendDialog(true);
                      }}
                    >
                      <Send className="w-3 h-3 mr-1" />
                      Send
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Builder Dialog */}
      <QuestionnaireBuilder
        open={showBuilder}
        onOpenChange={setShowBuilder}
        onSave={loadData}
      />

      {/* Send Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Questionnaire</DialogTitle>
            <DialogDescription>
              Send a questionnaire to a teacher, parent, or caregiver for {studentName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Template *</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Recipient Name *</Label>
              <Input
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="e.g., Mrs. Johnson"
              />
            </div>

            <div className="space-y-2">
              <Label>Recipient Email *</Label>
              <Input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Recipient Type</Label>
              <Select value={recipientType} onValueChange={setRecipientType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="caregiver">Caregiver</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendQuestionnaire} disabled={isSending}>
              {isSending ? 'Creating...' : 'Create & Get Link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Response Viewer */}
      {selectedInvitationId && (
        <ResponseViewer
          invitationId={selectedInvitationId}
          open={!!selectedInvitationId}
          onOpenChange={(open) => !open && setSelectedInvitationId(null)}
        />
      )}
    </div>
  );
}
