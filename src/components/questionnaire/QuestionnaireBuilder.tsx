import { useState } from 'react';
import { 
  Plus, Trash2, GripVertical, Type, List, Star, CheckCircle,
  Save, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Json } from '@/integrations/supabase/types';

interface Question {
  id: string;
  text: string;
  type: 'text' | 'multiple_choice' | 'rating' | 'yes_no';
  options?: string[];
  required: boolean;
}

interface QuestionnaireBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  editTemplate?: {
    id: string;
    name: string;
    description: string | null;
    questions: Question[];
  } | null;
}

const QUESTION_TYPES = [
  { value: 'text', label: 'Text Response', icon: Type },
  { value: 'multiple_choice', label: 'Multiple Choice', icon: List },
  { value: 'rating', label: 'Rating Scale (1-5)', icon: Star },
  { value: 'yes_no', label: 'Yes/No', icon: CheckCircle },
];

export function QuestionnaireBuilder({ 
  open, 
  onOpenChange, 
  onSave,
  editTemplate 
}: QuestionnaireBuilderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [name, setName] = useState(editTemplate?.name || '');
  const [description, setDescription] = useState(editTemplate?.description || '');
  const [questions, setQuestions] = useState<Question[]>(editTemplate?.questions || []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const generateId = () => Math.random().toString(36).substring(2, 11);

  const addQuestion = (type: Question['type']) => {
    const newQuestion: Question = {
      id: generateId(),
      text: '',
      type,
      required: true,
      ...(type === 'multiple_choice' && { options: ['Option 1', 'Option 2'] }),
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, ...updates } : q
    ));
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const addOption = (questionId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId && q.options) {
        return { ...q, options: [...q.options, `Option ${q.options.length + 1}`] };
      }
      return q;
    }));
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId && q.options) {
        const newOptions = [...q.options];
        newOptions[optionIndex] = value;
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const removeOption = (questionId: string, optionIndex: number) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId && q.options) {
        return { ...q, options: q.options.filter((_, i) => i !== optionIndex) };
      }
      return q;
    }));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: 'Please enter a template name', variant: 'destructive' });
      return;
    }

    if (questions.length === 0) {
      toast({ title: 'Please add at least one question', variant: 'destructive' });
      return;
    }

    const emptyQuestions = questions.filter(q => !q.text.trim());
    if (emptyQuestions.length > 0) {
      toast({ title: 'Please fill in all question texts', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    // Convert questions to Json type
    const questionsJson = JSON.parse(JSON.stringify(questions)) as Json;

    try {
      if (editTemplate?.id) {
        // Update existing
        const { error } = await supabase
          .from('questionnaire_templates')
          .update({
            name: name.trim(),
            description: description.trim() || null,
            questions: questionsJson,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editTemplate.id);

        if (error) throw error;
        toast({ title: 'Template updated!' });
      } else {
        // Create new
        const { error } = await supabase
          .from('questionnaire_templates')
          .insert([{
            user_id: user?.id!,
            name: name.trim(),
            description: description.trim() || null,
            questions: questionsJson,
          }]);

        if (error) throw error;
        toast({ title: 'Template created!' });
      }

      onSave();
      onOpenChange(false);
      
      // Reset form
      setName('');
      setDescription('');
      setQuestions([]);
    } catch (error) {
      console.error('Error saving template:', error);
      toast({ title: 'Failed to save template', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getQuestionTypeIcon = (type: Question['type']) => {
    const typeConfig = QUESTION_TYPES.find(t => t.value === type);
    if (!typeConfig) return Type;
    return typeConfig.icon;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editTemplate ? 'Edit Questionnaire Template' : 'Create Questionnaire Template'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name *</Label>
              <Input
                id="template-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Parent Interview, Teacher Questionnaire"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-description">Description (optional)</Label>
              <Textarea
                id="template-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of what this questionnaire is for..."
                rows={2}
              />
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Questions ({questions.length})</Label>
              <Select onValueChange={(value) => addQuestion(value as Question['type'])}>
                <SelectTrigger className="w-[180px]">
                  <Plus className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Add question" />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="w-4 h-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {questions.length === 0 ? (
              <Card className="py-8 border-dashed">
                <CardContent className="text-center text-muted-foreground">
                  <p>No questions yet. Add your first question above.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {questions.map((question, index) => {
                  const Icon = getQuestionTypeIcon(question.type);
                  return (
                    <Card key={question.id}>
                      <CardContent className="pt-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="flex items-center gap-2 pt-2">
                            <GripVertical className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">
                              {index + 1}
                            </span>
                          </div>
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground capitalize">
                                {question.type.replace('_', ' ')}
                              </span>
                            </div>
                            <Input
                              value={question.text}
                              onChange={(e) => updateQuestion(question.id, { text: e.target.value })}
                              placeholder="Enter your question..."
                            />

                            {/* Multiple choice options */}
                            {question.type === 'multiple_choice' && question.options && (
                              <div className="space-y-2 pl-4 border-l-2">
                                {question.options.map((option, optIndex) => (
                                  <div key={optIndex} className="flex items-center gap-2">
                                    <Input
                                      value={option}
                                      onChange={(e) => updateOption(question.id, optIndex, e.target.value)}
                                      className="flex-1"
                                    />
                                    {question.options!.length > 2 && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => removeOption(question.id, optIndex)}
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    )}
                                  </div>
                                ))}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => addOption(question.id)}
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  Add Option
                                </Button>
                              </div>
                            )}

                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={question.required}
                                  onCheckedChange={(checked) => 
                                    updateQuestion(question.id, { required: checked })
                                  }
                                />
                                <Label className="text-xs">Required</Label>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => removeQuestion(question.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? (
              'Saving...'
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {editTemplate ? 'Update Template' : 'Save Template'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
