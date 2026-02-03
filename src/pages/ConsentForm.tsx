import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ConsentFormViewer } from '@/components/consent/ConsentFormViewer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle, Clock, FileText, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ConsentFormTemplate {
  id: string;
  name: string;
  description?: string;
  form_type: string;
  fields: any[];
  signature_zones: any[];
}

interface ConsentFormSubmission {
  id: string;
  template_id: string;
  signer_name: string;
  signer_email?: string;
  status: string;
  signed_at?: string;
  expires_at: string;
  form_data: Record<string, any>;
}

export default function ConsentForm() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submission, setSubmission] = useState<ConsentFormSubmission | null>(null);
  const [template, setTemplate] = useState<ConsentFormTemplate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (token) {
      loadConsentForm();
    }
  }, [token]);

  const loadConsentForm = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch submission by access token
      const { data: submissionData, error: submissionError } = await supabase
        .from('consent_form_submissions')
        .select('*')
        .eq('access_token', token)
        .single();

      if (submissionError) {
        if (submissionError.code === 'PGRST116') {
          setError('This form link is invalid or has expired.');
        } else {
          throw submissionError;
        }
        return;
      }

      const submission: ConsentFormSubmission = {
        ...submissionData,
        form_data: (submissionData.form_data as unknown) as Record<string, any>
      };

      // Check if expired
      if (new Date(submission.expires_at) < new Date()) {
        setError('This form link has expired. Please request a new link.');
        return;
      }

      // Check if already signed
      if (submission.status === 'signed') {
        setSubmission(submission);
        setCompleted(true);
        return;
      }

      // Fetch template
      const { data: templateData, error: templateError } = await supabase
        .from('consent_form_templates')
        .select('*')
        .eq('id', submission.template_id)
        .single();

      if (templateError) throw templateError;

      // Log view event
      await supabase.from('signature_audit_log').insert({
        submission_id: submission.id,
        action: 'viewed',
        ip_address: null, // Will be captured server-side
        user_agent: navigator.userAgent
      });

      setSubmission(submission);
      setTemplate({
        ...templateData,
        fields: (templateData.fields as unknown) as any[],
        signature_zones: (templateData.signature_zones as unknown) as any[]
      });
    } catch (err) {
      console.error('Error loading consent form:', err);
      setError('Unable to load the consent form. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: { formData: Record<string, any>; signatures: Record<string, string> }) => {
    if (!submission || !template) return;

    try {
      setSubmitting(true);

      // Get the primary signature (first signature zone)
      const primarySignature = template.signature_zones[0]?.id 
        ? data.signatures[template.signature_zones[0].id] 
        : null;

      // Update submission with form data and signature
      const { error: updateError } = await supabase
        .from('consent_form_submissions')
        .update({
          form_data: data.formData,
          signature_data: primarySignature,
          signature_user_agent: navigator.userAgent,
          signed_at: new Date().toISOString(),
          status: 'signed'
        })
        .eq('id', submission.id);

      if (updateError) throw updateError;

      // Log signed event
      await supabase.from('signature_audit_log').insert({
        submission_id: submission.id,
        action: 'signed',
        user_agent: navigator.userAgent
      });

      setCompleted(true);
      toast.success('Form signed successfully!');
    } catch (err) {
      console.error('Error submitting form:', err);
      toast.error('Failed to submit form. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading consent form...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="p-3 rounded-full bg-destructive/10">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2">Form Unavailable</h2>
                <p className="text-muted-foreground">{error}</p>
              </div>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="p-3 rounded-full bg-green-100">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2">Form Submitted Successfully</h2>
                <p className="text-muted-foreground">
                  Thank you for completing the {template?.name || 'consent form'}. 
                  A copy has been saved for your records.
                </p>
              </div>
              
              <div className="w-full mt-4 p-4 bg-muted/50 rounded-lg space-y-2 text-sm text-left">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Signed: {submission?.signed_at ? format(new Date(submission.signed_at), 'PPpp') : 'Just now'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>Reference: {submission?.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span>Securely stored for 7 years</span>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mt-4">
                You may now close this window.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!template || !submission) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header with branding */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Consent Form</h1>
          <p className="text-muted-foreground mt-1">
            Please review and sign the following document
          </p>
        </div>

        {/* Expiration warning */}
        {submission.expires_at && (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardContent className="py-3">
              <div className="flex items-center gap-2 text-amber-700">
                <Clock className="h-4 w-4" />
                <span className="text-sm">
                  This link expires on {format(new Date(submission.expires_at), 'PPP')}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Form viewer */}
        <ConsentFormViewer
          template={template}
          initialData={submission.form_data}
          onSubmit={handleSubmit}
          isSubmitting={submitting}
        />

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            By signing this form, you acknowledge that you have read and agree to the terms.
          </p>
          <p className="mt-2 flex items-center justify-center gap-1">
            <Shield className="h-3 w-3" />
            Secured with 256-bit encryption
          </p>
        </div>
      </div>
    </div>
  );
}
