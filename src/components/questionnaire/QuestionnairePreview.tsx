import { useState, useEffect } from 'react';
import { 
  ClipboardList, Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { ABAS3FormRenderer } from './ABAS3FormRenderer';

interface Question {
  id: string;
  text: string;
  type: 'text' | 'multiple_choice' | 'rating' | 'yes_no';
  options?: string[];
  required: boolean;
}

interface ABAS3Question {
  id: string;
  text: string;
  domain: string;
  number: number;
}

interface QuestionnairePreviewProps {
  templateId: string;
  templateType: 'custom' | 'abas3' | 'vbmapp' | 'socially_savvy';
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuestionnairePreview({ 
  templateId, 
  templateType, 
  open, 
  onOpenChange 
}: QuestionnairePreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [template, setTemplate] = useState<{
    name: string;
    description: string | null;
    questions: Question[] | ABAS3Question[];
  } | null>(null);
  const [previewResponses, setPreviewResponses] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open || !templateId) return;

    const loadTemplate = async () => {
      setIsLoading(true);
      try {
        let templateData: any = null;

        if (templateType === 'abas3') {
          const { data } = await supabase
            .from('abas3_form_templates')
            .select('*')
            .eq('id', templateId)
            .single();
          templateData = data;
        } else if (templateType === 'vbmapp') {
          const { data } = await supabase
            .from('vbmapp_form_templates')
            .select('*')
            .eq('id', templateId)
            .single();
          templateData = data;
        } else if (templateType === 'socially_savvy') {
          const { data } = await supabase
            .from('socially_savvy_form_templates')
            .select('*')
            .eq('id', templateId)
            .single();
          templateData = data;
        } else {
          const { data } = await supabase
            .from('questionnaire_templates')
            .select('*')
            .eq('id', templateId)
            .single();
          templateData = data;
        }

        if (templateData) {
          setTemplate({
            name: templateData.form_name || templateData.name || 'Questionnaire',
            description: templateData.description || null,
            questions: (templateData.questions as unknown as Question[]) || [],
          });
        }
      } catch (error) {
        console.error('Error loading template:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTemplate();
  }, [templateId, templateType, open]);

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Loading Preview...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const questions = template?.questions || [];
  const isABAS3 = templateType === 'abas3';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            <DialogTitle>Preview: {template?.name}</DialogTitle>
          </div>
          <DialogDescription>
            This is how the questionnaire will appear to respondents
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 pb-4">
            {/* Preview Banner */}
            <div className="bg-muted border border-border rounded-lg p-3 flex items-center gap-2 text-muted-foreground">
              <Eye className="w-4 h-4" />
              <span className="text-sm">Preview Mode - Responses will not be saved</span>
            </div>

            {/* Header Preview */}
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="pt-4 text-center">
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-3">
                  <ClipboardList className="w-6 h-6 text-primary-foreground" />
                </div>
                <h2 className="text-xl font-bold">{template?.name}</h2>
                {template?.description && (
                  <p className="text-muted-foreground text-sm mt-1">{template.description}</p>
                )}
                <Badge variant="secondary" className="mt-2">{questions.length} questions</Badge>
              </CardContent>
            </Card>

            {/* ABAS-3 Preview */}
            {isABAS3 ? (
              <ABAS3FormRenderer
                questions={questions as ABAS3Question[]}
                responses={previewResponses}
                onResponseChange={(questionId, value) =>
                  setPreviewResponses((prev) => ({ ...prev, [questionId]: value }))
                }
              />
            ) : (
              <>
                {/* Custom Form Questions Preview */}
                {(questions as Question[]).map((question, index) => (
                  <Card key={question.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-start gap-2">
                        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-sm">
                          {index + 1}
                        </span>
                        <span>
                          {question.text || 'Question text...'}
                          {question.required && <span className="text-destructive ml-1">*</span>}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {question.type === 'text' && (
                        <Textarea
                          placeholder="Respondent will enter text here..."
                          disabled
                          className="opacity-60"
                          rows={3}
                        />
                      )}

                      {question.type === 'multiple_choice' && question.options && (
                        <RadioGroup disabled className="opacity-80">
                          <div className="space-y-2">
                            {question.options.map((option, optIndex) => (
                              <div key={optIndex} className="flex items-center space-x-2">
                                <RadioGroupItem value={option} id={`preview-${question.id}-${optIndex}`} disabled />
                                <Label htmlFor={`preview-${question.id}-${optIndex}`} className="cursor-default">
                                  {option}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </RadioGroup>
                      )}

                      {question.type === 'yes_no' && (
                        <RadioGroup disabled className="flex gap-4 opacity-80">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id={`preview-${question.id}-yes`} disabled />
                            <Label className="cursor-default">Yes</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id={`preview-${question.id}-no`} disabled />
                            <Label className="cursor-default">No</Label>
                          </div>
                        </RadioGroup>
                      )}

                      {question.type === 'rating' && (
                        <div className="flex gap-2 opacity-80">
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <Button
                              key={rating}
                              variant="outline"
                              className="w-12 h-12"
                              disabled
                            >
                              {rating}
                            </Button>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </>
            )}

            {/* Submit Button Preview */}
            <Button className="w-full h-12" disabled>
              Submit Responses (Preview)
            </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
