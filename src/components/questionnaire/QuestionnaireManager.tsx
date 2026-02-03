import { useState, useEffect } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  Send, Plus, FileText, Clock, CheckCircle, AlertCircle,
  Mail, User, Trash2, Eye, ExternalLink, Copy, ClipboardList,
  Users, Bell, Calendar, RefreshCw, Pencil
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
import { QuestionnairePreview } from './QuestionnairePreview';
import { InPersonCompletion } from './InPersonCompletion';

interface Template {
  id: string;
  name: string;
  description: string | null;
  questions: unknown[];
  created_at: string;
}

interface ABAS3Form {
  id: string;
  form_code: string;
  form_name: string;
  respondent_type: string;
  age_range: string;
}

interface VBMAPPForm {
  id: string;
  form_code: string;
  form_name: string;
  form_type: string;
  level: string | null;
  age_range: string | null;
  description: string | null;
}

interface SociallySavvyForm {
  id: string;
  form_code: string;
  form_name: string;
  description: string | null;
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
  form_type?: string;
  created_at?: string;
  first_opened_at?: string | null;
  last_opened_at?: string | null;
  open_count?: number;
  progress_percent?: number;
}

interface QuestionnaireManagerProps {
  studentId: string;
  studentName: string;
}

export function QuestionnaireManager({ studentId, studentName }: QuestionnaireManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [abas3Forms, setAbas3Forms] = useState<ABAS3Form[]>([]);
  const [vbmappForms, setVbmappForms] = useState<VBMAPPForm[]>([]);
  const [sociallySavvyForms, setSociallySavvyForms] = useState<SociallySavvyForm[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedTemplateType, setSelectedTemplateType] = useState<'custom' | 'abas3' | 'vbmapp' | 'socially_savvy'>('custom');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientType, setRecipientType] = useState<string>('teacher');
  const [isSending, setIsSending] = useState(false);
  const [selectedInvitationId, setSelectedInvitationId] = useState<string | null>(null);
  
  // New states for preview and in-person completion
  const [showPreview, setShowPreview] = useState(false);
  const [previewTemplateId, setPreviewTemplateId] = useState<string>('');
  const [previewTemplateType, setPreviewTemplateType] = useState<'custom' | 'abas3' | 'vbmapp' | 'socially_savvy'>('custom');
  const [showInPerson, setShowInPerson] = useState(false);
  const [inPersonTemplateId, setInPersonTemplateId] = useState<string>('');
  const [inPersonTemplateType, setInPersonTemplateType] = useState<'custom' | 'abas3' | 'vbmapp' | 'socially_savvy'>('custom');
  
  // Track newly completed for highlighting
  const [newlyCompletedIds, setNewlyCompletedIds] = useState<Set<string>>(new Set());

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load custom templates
      const { data: templatesData } = await supabase
        .from('questionnaire_templates')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (templatesData) {
        setTemplates(templatesData as Template[]);
      }

      // Load ABAS-3 standardized forms
      const { data: abas3Data } = await supabase
        .from('abas3_form_templates')
        .select('id, form_code, form_name, respondent_type, age_range')
        .order('form_code');

      if (abas3Data) {
        setAbas3Forms(abas3Data as ABAS3Form[]);
      }

      // Load VB-MAPP standardized forms
      const { data: vbmappData } = await supabase
        .from('vbmapp_form_templates')
        .select('id, form_code, form_name, form_type, level, age_range, description')
        .order('form_code');

      if (vbmappData) {
        setVbmappForms(vbmappData as VBMAPPForm[]);
      }

      // Load Socially Savvy forms
      const { data: ssData } = await supabase
        .from('socially_savvy_form_templates')
        .select('id, form_code, form_name, description')
        .order('form_code');

      if (ssData) {
        setSociallySavvyForms(ssData as SociallySavvyForm[]);
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
      // Create the invitation first (common for all types)
      const { data: invitation, error: invError } = await supabase
        .from('questionnaire_invitations')
        .insert({
          template_id: selectedTemplateId,
          student_id: studentId,
          recipient_name: recipientName.trim(),
          recipient_email: recipientEmail.trim(),
          recipient_type: recipientType,
          created_by: user?.id,
          sent_at: new Date().toISOString(),
          form_type: selectedTemplateType,
        })
        .select()
        .single();

      if (invError) throw invError;

      let assessmentName = 'Questionnaire';

      if (selectedTemplateType === 'abas3') {
        // Create the ABAS-3 assessment record
        const { error: assessError } = await supabase
          .from('abas3_assessments')
          .insert({
            student_id: studentId,
            form_template_id: selectedTemplateId,
            invitation_id: invitation.id,
            date_administered: new Date().toISOString().split('T')[0],
            administered_by: user?.id,
            respondent_name: recipientName.trim(),
            respondent_relationship: recipientType,
            status: 'pending',
          });

        if (assessError) throw assessError;
        assessmentName = 'ABAS-3 Assessment';
      } else if (selectedTemplateType === 'vbmapp') {
        // Create the VB-MAPP assessment record
        const { error: assessError } = await supabase
          .from('vbmapp_assessments')
          .insert({
            student_id: studentId,
            form_template_id: selectedTemplateId,
            invitation_id: invitation.id,
            date_administered: new Date().toISOString().split('T')[0],
            administered_by: user?.id,
            respondent_name: recipientName.trim(),
            respondent_relationship: recipientType,
            status: 'pending',
          });

        if (assessError) throw assessError;
        assessmentName = 'VB-MAPP Assessment';
      } else if (selectedTemplateType === 'socially_savvy') {
        // Create the Socially Savvy assessment record
        const { error: assessError } = await supabase
          .from('socially_savvy_assessments')
          .insert({
            student_id: studentId,
            form_template_id: selectedTemplateId,
            invitation_id: invitation.id,
            date_administered: new Date().toISOString().split('T')[0],
            administered_by: user?.id,
            respondent_name: recipientName.trim(),
            respondent_relationship: recipientType,
            status: 'pending',
          });

        if (assessError) throw assessError;
        assessmentName = 'Socially Savvy Assessment';
      }

      toast({
        title: `${assessmentName} Created!`,
        description: 'Copy the link to share with the recipient.',
      });

      setShowSendDialog(false);
      setSelectedTemplateId('');
      setSelectedTemplateType('custom');
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

  const getStatusBadge = (inv: Invitation) => {
    const isNew = newlyCompletedIds.has(inv.id);
    switch (inv.status) {
      case 'completed':
        return (
          <div className="flex items-center gap-1">
            <Badge variant="default" className={`bg-green-600 ${isNew ? 'animate-pulse' : ''}`}>
              <CheckCircle className="w-3 h-3 mr-1" />Completed
            </Badge>
            {isNew && (
              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300">
                <Bell className="w-3 h-3 mr-1" />New
              </Badge>
            )}
          </div>
        );
      case 'expired':
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />Expired</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const openPreview = (templateId: string, templateType: 'custom' | 'abas3' | 'vbmapp' | 'socially_savvy') => {
    setPreviewTemplateId(templateId);
    setPreviewTemplateType(templateType);
    setShowPreview(true);
  };

  const openInPerson = (templateId: string, templateType: 'custom' | 'abas3' | 'vbmapp' | 'socially_savvy') => {
    setInPersonTemplateId(templateId);
    setInPersonTemplateType(templateType);
    setShowInPerson(true);
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to delete this questionnaire invitation? This cannot be undone.')) {
      return;
    }

    try {
      // Delete related assessment records first (foreign key constraints)
      // ABAS-3 assessments
      await supabase
        .from('abas3_assessments')
        .delete()
        .eq('invitation_id', invitationId);

      // Socially Savvy assessments
      await supabase
        .from('socially_savvy_assessments')
        .delete()
        .eq('invitation_id', invitationId);

      // Delete any questionnaire responses
      await supabase
        .from('questionnaire_responses')
        .delete()
        .eq('invitation_id', invitationId);

      // Finally delete the invitation itself
      const { error } = await supabase
        .from('questionnaire_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;

      toast({ title: 'Questionnaire deleted' });
      loadData();
    } catch (error) {
      console.error('Error deleting invitation:', error);
      toast({ title: 'Failed to delete questionnaire', variant: 'destructive' });
    }
  };

  const getProgressDisplay = (inv: Invitation) => {
    if (inv.status === 'completed') {
      return <Badge className="bg-green-600">100%</Badge>;
    }
    if (!inv.first_opened_at) {
      return <span className="text-muted-foreground text-xs">Not opened</span>;
    }
    if (inv.progress_percent && inv.progress_percent > 0) {
      return <Badge variant="outline">{inv.progress_percent}%</Badge>;
    }
    return <span className="text-xs text-amber-600">Opened</span>;
  };

  // Calculate summary stats
  const completedCount = invitations.filter(i => i.status === 'completed').length;
  const pendingCount = invitations.filter(i => i.status === 'pending').length;
  const recentlyCompleted = invitations.filter(i => 
    i.status === 'completed' && 
    i.completed_at && 
    new Date(i.completed_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).length;

  // VB-MAPP is tracker_internal - not included in sendable templates
  const hasAnyTemplates = templates.length > 0 || abas3Forms.length > 0 || sociallySavvyForms.length > 0;

  const handleTemplateSelect = (value: string) => {
    // Check which type of form this is
    const isAbas3 = abas3Forms.some(f => f.id === value);
    const isVbmapp = vbmappForms.some(f => f.id === value);
    const isSociallySavvy = sociallySavvyForms.some(f => f.id === value);
    
    if (isAbas3) {
      setSelectedTemplateType('abas3');
      const form = abas3Forms.find(f => f.id === value);
      if (form) {
        setRecipientType(form.respondent_type);
      }
    } else if (isVbmapp) {
      setSelectedTemplateType('vbmapp');
    } else if (isSociallySavvy) {
      setSelectedTemplateType('socially_savvy');
    } else {
      setSelectedTemplateType('custom');
    }
    
    setSelectedTemplateId(value);
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
          <Button onClick={() => setShowSendDialog(true)} disabled={!hasAnyTemplates}>
            <Send className="w-4 h-4 mr-2" />
            Send Questionnaire
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {invitations.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span className="text-2xl font-bold">{pendingCount}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Pending</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-2xl font-bold">{completedCount}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Completed</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                <span className="text-2xl font-bold">{recentlyCompleted}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ABAS-3 Standardized Assessments */}
      {abas3Forms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              ABAS-3 Standardized Forms
            </CardTitle>
            <CardDescription>
              Send standardized adaptive behavior assessments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {abas3Forms.map((form) => (
                <div
                  key={form.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <ClipboardList className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">{form.form_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Ages {form.age_range} • {form.respondent_type.charAt(0).toUpperCase() + form.respondent_type.slice(1)} form
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openPreview(form.id, 'abas3')}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Preview</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openInPerson(form.id, 'abas3')}
                        >
                          <Users className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Complete In-Person</TooltipContent>
                    </Tooltip>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleTemplateSelect(form.id);
                        setRecipientType(form.respondent_type);
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
          </CardContent>
        </Card>
      )}

      {/* VB-MAPP Note: VB-MAPP is an internal tracker, not a sendable questionnaire.
          It is accessed via Student Profile > Skills > Curriculum tab */}

      {/* Socially Savvy Assessments */}
      {sociallySavvyForms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Socially Savvy Assessments
            </CardTitle>
            <CardDescription>
              Comprehensive social skills assessment checklist
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {sociallySavvyForms.map((form) => (
                <div
                  key={form.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <ClipboardList className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">{form.form_name}</p>
                      {form.description && (
                        <p className="text-xs text-muted-foreground">{form.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openPreview(form.id, 'socially_savvy')}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Preview</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openInPerson(form.id, 'socially_savvy')}
                        >
                          <Users className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Complete In-Person</TooltipContent>
                    </Tooltip>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleTemplateSelect(form.id);
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
          </CardContent>
        </Card>
      )}

      {/* Sent Questionnaires */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Sent Questionnaires
              </CardTitle>
              <CardDescription>
                Track questionnaires sent for {studentName}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={loadData}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
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
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => {
                  // Look up template name from all sources
                  const customTemplate = templates.find(t => t.id === inv.template_id);
                  const abas3Form = abas3Forms.find(f => f.id === inv.template_id);
                  const vbmappForm = vbmappForms.find(f => f.id === inv.template_id);
                  const ssForm = sociallySavvyForms.find(f => f.id === inv.template_id);
                  const templateName = customTemplate?.name || abas3Form?.form_name || vbmappForm?.form_name || ssForm?.form_name || 'Unknown';
                  const isInPerson = inv.recipient_email?.includes('@internal.local');
                  
                  return (
                    <TableRow key={inv.id} className={newlyCompletedIds.has(inv.id) ? 'bg-green-50 dark:bg-green-950/20' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {isInPerson ? (
                            <Users className="w-4 h-4 text-primary" />
                          ) : (
                            <User className="w-4 h-4 text-muted-foreground" />
                          )}
                          <div>
                            <p className="font-medium text-sm">{inv.recipient_name}</p>
                            {isInPerson ? (
                              <p className="text-xs text-primary">In-person</p>
                            ) : (
                              <p className="text-xs text-muted-foreground">{inv.recipient_email}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-xs">
                          {inv.recipient_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{templateName}</TableCell>
                      <TableCell>{getProgressDisplay(inv)}</TableCell>
                      <TableCell>{getStatusBadge(inv)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {inv.sent_at ? format(new Date(inv.sent_at), 'MMM d, yyyy') : '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {inv.completed_at ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-green-600 cursor-help">
                                {formatDistanceToNow(new Date(inv.completed_at), { addSuffix: true })}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {format(new Date(inv.completed_at), 'MMM d, yyyy h:mm a')}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {inv.status === 'completed' && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedInvitationId(inv.id)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View Responses</TooltipContent>
                            </Tooltip>
                          )}
                          {inv.status === 'pending' && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyLink(inv.access_token)}
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copy Link</TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDeleteInvitation(inv.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
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
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openPreview(template.id, 'custom')}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Preview</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openInPerson(template.id, 'custom')}
                        >
                          <Users className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Complete In-Person</TooltipContent>
                    </Tooltip>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTemplateId(template.id);
                        setSelectedTemplateType('custom');
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
              <Label>Select Form or Template *</Label>
              <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a form or template..." />
                </SelectTrigger>
                <SelectContent>
                  {abas3Forms.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        ABAS-3 Standardized Forms
                      </div>
                      {abas3Forms.map((form) => (
                        <SelectItem key={form.id} value={form.id}>
                          <div className="flex items-center gap-2">
                            <ClipboardList className="w-3 h-3 text-primary" />
                            <span>{form.form_name}</span>
                            <span className="text-xs text-muted-foreground">({form.age_range})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {/* VB-MAPP excluded - it's an internal tracker, not sendable */}
                  {sociallySavvyForms.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Socially Savvy Assessments
                      </div>
                      {sociallySavvyForms.map((form) => (
                        <SelectItem key={form.id} value={form.id}>
                          <div className="flex items-center gap-2">
                            <ClipboardList className="w-3 h-3 text-primary" />
                            <span>{form.form_name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {templates.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Custom Templates
                      </div>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          <div className="flex items-center gap-2">
                            <FileText className="w-3 h-3" />
                            <span>{t.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
              {selectedTemplateType === 'abas3' && (
                <p className="text-xs text-muted-foreground">
                  This is a standardized ABAS-3 assessment form. Responses will be automatically scored.
                </p>
              )}
              {selectedTemplateType === 'vbmapp' && (
                <p className="text-xs text-muted-foreground">
                  VB-MAPP: Verbal Behavior Milestones Assessment and Placement Program.
                </p>
              )}
              {selectedTemplateType === 'socially_savvy' && (
                <p className="text-xs text-muted-foreground">
                  Comprehensive social skills checklist covering multiple domains.
                </p>
              )}
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

      {/* Preview Dialog */}
      <QuestionnairePreview
        templateId={previewTemplateId}
        templateType={previewTemplateType}
        open={showPreview}
        onOpenChange={setShowPreview}
      />

      {/* In-Person Completion Dialog */}
      <InPersonCompletion
        templateId={inPersonTemplateId}
        templateType={inPersonTemplateType}
        studentId={studentId}
        studentName={studentName}
        open={showInPerson}
        onOpenChange={setShowInPerson}
        onComplete={loadData}
      />
    </div>
  );
}
