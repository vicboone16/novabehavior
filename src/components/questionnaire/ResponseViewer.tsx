import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  FileText, User, Calendar, CheckCircle, Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';

interface Question {
  id: string;
  text: string;
  type: string;
  required: boolean;
}

interface ResponseViewerProps {
  invitationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ResponseViewer({ invitationId, open, onOpenChange }: ResponseViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [template, setTemplate] = useState<any>(null);
  const [response, setResponse] = useState<any>(null);

  useEffect(() => {
    if (!open || !invitationId) return;

    const loadResponse = async () => {
      setIsLoading(true);
      try {
        // Load invitation
        const { data: invData } = await supabase
          .from('questionnaire_invitations')
          .select('*')
          .eq('id', invitationId)
          .single();

        if (invData) {
          setInvitation(invData);

          // Load template
          const { data: templateData } = await supabase
            .from('questionnaire_templates')
            .select('*')
            .eq('id', invData.template_id)
            .single();

          if (templateData) {
            setTemplate(templateData);
          }

          // Load response
          const { data: responseData } = await supabase
            .from('questionnaire_responses')
            .select('*')
            .eq('invitation_id', invitationId)
            .single();

          if (responseData) {
            setResponse(responseData);
          }
        }
      } catch (error) {
        console.error('Error loading response:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadResponse();
  }, [invitationId, open]);

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Loading Response...</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const questions = (template?.questions as Question[]) || [];
  const answers = (response?.responses as Record<string, string>) || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {template?.name} - Response
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-6 pr-4">
            {/* Respondent Info */}
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground text-xs">Respondent</p>
                      <p className="font-medium">{invitation?.recipient_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {invitation?.recipient_type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground text-xs">Submitted</p>
                      <p className="font-medium">
                        {response?.submitted_at 
                          ? format(new Date(response.submitted_at), 'MMM d, yyyy h:mm a')
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <p className="font-medium text-green-600">Completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Questions and Answers */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Responses</h4>
              
              {questions.map((question, index) => (
                <Card key={question.id}>
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <div className="flex items-start gap-2 text-foreground">
                        <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded">
                          {index + 1}
                        </span>
                        <p className="text-sm font-medium flex-1">{question.text}</p>
                      </div>
                      <div className="pl-7">
                        {answers[question.id] ? (
                          <p className="text-sm bg-muted p-3 rounded-lg">
                            {answers[question.id]}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            No response provided
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
