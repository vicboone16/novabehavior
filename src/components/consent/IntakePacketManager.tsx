import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  FileText, 
  Send, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  ExternalLink,
  RefreshCw,
  Plus,
  Loader2,
  Mail
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';

interface ConsentFormTemplate {
  id: string;
  name: string;
  description?: string;
  form_type: string;
}

interface ConsentFormSubmission {
  id: string;
  template_id: string;
  signer_name: string;
  signer_email?: string;
  status: string;
  signed_at?: string;
  expires_at: string;
  access_token: string;
  created_at: string;
  consent_form_templates?: ConsentFormTemplate;
}

interface IntakePacketManagerProps {
  studentId: string;
  referralId?: string;
}

export function IntakePacketManager({ studentId, referralId }: IntakePacketManagerProps) {
  const [templates, setTemplates] = useState<ConsentFormTemplate[]>([]);
  const [submissions, setSubmissions] = useState<ConsentFormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [signerRelationship, setSignerRelationship] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadData();
  }, [studentId, referralId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load templates
      const { data: templateData, error: templateError } = await supabase
        .from('consent_form_templates')
        .select('id, name, description, form_type')
        .eq('is_active', true)
        .order('name');

      if (templateError) throw templateError;
      setTemplates(templateData || []);

      // Load submissions for this student/referral
      let query = supabase
        .from('consent_form_submissions')
        .select(`
          *,
          consent_form_templates (id, name, description, form_type)
        `)
        .order('created_at', { ascending: false });

      if (studentId) {
        query = query.eq('student_id', studentId);
      }
      if (referralId) {
        query = query.eq('referral_id', referralId);
      }

      const { data: submissionData, error: submissionError } = await query;

      if (submissionError) throw submissionError;
      setSubmissions(submissionData || []);
    } catch (err) {
      console.error('Error loading intake data:', err);
      toast.error('Failed to load consent forms');
    } finally {
      setLoading(false);
    }
  };

  const handleSendForm = async () => {
    if (!selectedTemplate || !signerName) {
      toast.error('Please select a form and enter signer name');
      return;
    }

    try {
      setSending(true);

      // Create submission
      const { data: submission, error } = await supabase
        .from('consent_form_submissions')
        .insert({
          template_id: selectedTemplate,
          student_id: studentId,
          referral_id: referralId || null,
          signer_name: signerName,
          signer_email: signerEmail || null,
          signer_relationship: signerRelationship || null
        })
        .select()
        .single();

      if (error) throw error;

      // Log creation
      await supabase.from('signature_audit_log').insert({
        submission_id: submission.id,
        action: 'created'
      });

      // TODO: If email provided, send via edge function
      // For now, we'll just show the link

      toast.success('Consent form created! Share the link with the signer.');
      setSendDialogOpen(false);
      resetForm();
      loadData();
    } catch (err) {
      console.error('Error creating consent form:', err);
      toast.error('Failed to create consent form');
    } finally {
      setSending(false);
    }
  };

  const resetForm = () => {
    setSelectedTemplate('');
    setSignerName('');
    setSignerEmail('');
    setSignerRelationship('');
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/consent/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  const openForm = (token: string) => {
    window.open(`/consent/${token}`, '_blank');
  };

  const resendForm = async (submission: ConsentFormSubmission) => {
    try {
      // Extend expiration
      const { error } = await supabase
        .from('consent_form_submissions')
        .update({
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', submission.id);

      if (error) throw error;

      // Log resend
      await supabase.from('signature_audit_log').insert({
        submission_id: submission.id,
        action: 'resent'
      });

      toast.success('Form link extended and ready to share');
      loadData();
    } catch (err) {
      console.error('Error resending form:', err);
      toast.error('Failed to resend form');
    }
  };

  const getStatusBadge = (status: string, expiresAt: string) => {
    const isExpired = new Date(expiresAt) < new Date();
    
    if (status === 'signed') {
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Signed</Badge>;
    }
    if (isExpired) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    if (status === 'voided') {
      return <Badge variant="secondary">Voided</Badge>;
    }
    return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Pending</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Consent & Intake Forms</CardTitle>
          <CardDescription>
            Send and track signed consent forms
          </CardDescription>
        </div>
        <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Send Form
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Consent Form</DialogTitle>
              <DialogDescription>
                Create a consent form link to share with the parent/guardian
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Form Template *</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a form..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          {template.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signer-name">Signer's Full Name *</Label>
                <Input
                  id="signer-name"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Parent/Guardian name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signer-email">Signer's Email (optional)</Label>
                <Input
                  id="signer-email"
                  type="email"
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signer-relationship">Relationship to Client</Label>
                <Select value={signerRelationship} onValueChange={setSignerRelationship}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select relationship..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="guardian">Legal Guardian</SelectItem>
                    <SelectItem value="caregiver">Caregiver</SelectItem>
                    <SelectItem value="self">Self (Adult Client)</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setSendDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSendForm} disabled={sending || !selectedTemplate || !signerName}>
                  {sending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Create Form Link
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {submissions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No consent forms sent yet</p>
            <p className="text-sm">Click "Send Form" to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.map((submission) => (
              <div
                key={submission.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {submission.consent_form_templates?.name || 'Unknown Form'}
                      </span>
                      {getStatusBadge(submission.status, submission.expires_at)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {submission.signer_name}
                      {submission.status === 'signed' && submission.signed_at ? (
                        <span> • Signed {formatDistanceToNow(new Date(submission.signed_at), { addSuffix: true })}</span>
                      ) : (
                        <span> • Sent {formatDistanceToNow(new Date(submission.created_at), { addSuffix: true })}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {submission.status === 'pending' && new Date(submission.expires_at) > new Date() && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyLink(submission.access_token)}
                        title="Copy link"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openForm(submission.access_token)}
                        title="Open form"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {(submission.status === 'pending' && new Date(submission.expires_at) < new Date()) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => resendForm(submission)}
                      className="gap-1"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Resend
                    </Button>
                  )}
                  {submission.status === 'signed' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openForm(submission.access_token)}
                      title="View signed form"
                    >
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
