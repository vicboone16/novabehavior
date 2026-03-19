import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileText, Users, Bot, PenTool, Eye, Plus } from 'lucide-react';
import type { FormTemplate } from '@/hooks/useIntakeFormsEngine';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  templates: FormTemplate[];
  searchQuery: string;
  isLoading: boolean;
  onAssigned?: (instanceId: string) => void;
}

export function IntakeTemplateLibrary({ templates, searchQuery, isLoading, onAssigned }: Props) {
  const [assignDialog, setAssignDialog] = useState<{ open: boolean; template: FormTemplate | null }>({ open: false, template: null });
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [completionMode, setCompletionMode] = useState('internal');
  const [isAssigning, setIsAssigning] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const filtered = templates.filter(t =>
    !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openAssignDialog = async (template: FormTemplate) => {
    setAssignDialog({ open: true, template });
    setSelectedStudentId('');
    setCompletionMode('internal');
    setLoadingStudents(true);
    try {
      const { data } = await supabase.from('students').select('id, name').eq('is_archived', false).order('name').limit(100);
      setStudents((data || []) as any[]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleAssign = async () => {
    if (!assignDialog.template || !selectedStudentId) return;
    setIsAssigning(true);
    try {
      const { data: defData } = await supabase.from('form_definitions').select('id').eq('is_active', true).limit(1).single();
      const { data, error } = await supabase
        .from('form_instances')
        .insert({
          template_id: assignDialog.template.id,
          student_id: selectedStudentId,
          form_definition_id: defData?.id || assignDialog.template.id,
          completion_mode: completionMode,
          linked_entity_type: 'student',
          linked_entity_id: selectedStudentId,
          status: 'draft',
          delivery_method: completionMode === 'parent' ? 'secure_link' : 'in_app',
        } as any)
        .select('id')
        .single();
      if (error) throw error;
      toast.success(`"${assignDialog.template.name}" assigned successfully`);
      setAssignDialog({ open: false, template: null });
      onAssigned?.(data.id);
    } catch (err: any) {
      toast.error('Assignment failed: ' + err.message);
    } finally {
      setIsAssigning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            {searchQuery ? 'No templates match your search' : 'No form templates configured yet'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const grouped = filtered.reduce<Record<string, FormTemplate[]>>((acc, t) => {
    const cat = t.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  return (
    <>
      <div className="space-y-6">
        {Object.entries(grouped).map(([category, temps]) => (
          <div key={category}>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {category.replace(/_/g, ' ')}
            </h3>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {temps.map(template => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <Badge variant="outline" className="text-xs shrink-0">v{template.version}</Badge>
                    </div>
                    {template.description && (
                      <CardDescription className="text-xs line-clamp-2">{template.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {template.allow_parent_completion && (
                        <Badge variant="secondary" className="text-xs gap-1"><Users className="h-3 w-3" /> Parent</Badge>
                      )}
                      {template.allow_internal_completion && (
                        <Badge variant="secondary" className="text-xs gap-1"><FileText className="h-3 w-3" /> Internal</Badge>
                      )}
                      {template.allow_ai_prefill && (
                        <Badge variant="secondary" className="text-xs gap-1"><Bot className="h-3 w-3" /> AI</Badge>
                      )}
                      {(template.require_signature_parent || template.require_signature_staff) && (
                        <Badge variant="secondary" className="text-xs gap-1"><PenTool className="h-3 w-3" /> Signature</Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Eye className="h-3.5 w-3.5 mr-1" /> Preview
                      </Button>
                      <Button size="sm" className="flex-1" onClick={() => openAssignDialog(template)}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Assign
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={assignDialog.open} onOpenChange={open => !open && setAssignDialog({ open: false, template: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Form</DialogTitle>
            {assignDialog.template && (
              <p className="text-sm text-muted-foreground">{assignDialog.template.name}</p>
            )}
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Student / Referral</Label>
              {loadingStudents ? (
                <div className="flex items-center gap-2 py-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
              ) : (
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger><SelectValue placeholder="Select student..." /></SelectTrigger>
                  <SelectContent>
                    {students.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label>Completion Mode</Label>
              <Select value={completionMode} onValueChange={setCompletionMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Internal (Staff)</SelectItem>
                  <SelectItem value="parent">Parent (Send Link)</SelectItem>
                  <SelectItem value="hybrid">Hybrid (Shared)</SelectItem>
                  <SelectItem value="ai_prefill">AI-Assisted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog({ open: false, template: null })}>Cancel</Button>
            <Button onClick={handleAssign} disabled={isAssigning || !selectedStudentId}>
              {isAssigning && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Assign Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
