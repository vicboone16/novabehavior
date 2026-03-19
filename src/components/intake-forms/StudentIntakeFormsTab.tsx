import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, FileText, Loader2 } from 'lucide-react';
import { useIntakeFormsEngine } from '@/hooks/useIntakeFormsEngine';
import { IntakeInstancesList } from './IntakeInstancesList';
import { IntakeFormRenderer } from './IntakeFormRenderer';

interface Props {
  studentId: string;
  referralId?: string;
}

export function StudentIntakeFormsTab({ studentId, referralId }: Props) {
  const engine = useIntakeFormsEngine({ studentId, referralId });
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [completionMode, setCompletionMode] = useState('internal');

  if (selectedInstanceId) {
    return (
      <IntakeFormRenderer
        instanceId={selectedInstanceId}
        onBack={() => setSelectedInstanceId(null)}
      />
    );
  }

  const handleAssign = async () => {
    if (!selectedTemplate) return;
    setIsAssigning(true);
    try {
      const result = await engine.createInstance.mutateAsync({
        templateId: selectedTemplate,
        studentId,
        completionMode,
        linkedEntityType: referralId ? 'referral' : 'student',
        linkedEntityId: referralId || studentId,
      });
      if (result) {
        setSelectedInstanceId(result.id);
      }
    } finally {
      setIsAssigning(false);
      setSelectedTemplate('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Intake & Forms
        </h3>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Assign Form
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Intake Form</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Template</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a form template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {engine.templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Completion Mode</Label>
                <Select value={completionMode} onValueChange={setCompletionMode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal (Staff Only)</SelectItem>
                    <SelectItem value="parent">Parent (Send to Caregiver)</SelectItem>
                    <SelectItem value="hybrid">Hybrid (Shared)</SelectItem>
                    <SelectItem value="ai">AI-Assisted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAssign} disabled={isAssigning || !selectedTemplate}>
                {isAssigning && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Assign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">
            All
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{engine.instances.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="drafts">Drafts</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="submitted">Submitted</TabsTrigger>
          <TabsTrigger value="finalized">Finalized</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <IntakeInstancesList
            instances={engine.instances}
            title=""
            emptyMessage="No forms for this case yet"
            onOpen={setSelectedInstanceId}
            isLoading={engine.isLoading}
          />
        </TabsContent>
        <TabsContent value="drafts">
          <IntakeInstancesList
            instances={engine.draftInstances}
            title=""
            emptyMessage="No drafts"
            onOpen={setSelectedInstanceId}
            isLoading={engine.isLoading}
          />
        </TabsContent>
        <TabsContent value="pending">
          <IntakeInstancesList
            instances={engine.pendingInstances}
            title=""
            emptyMessage="No pending forms"
            onOpen={setSelectedInstanceId}
            isLoading={engine.isLoading}
          />
        </TabsContent>
        <TabsContent value="submitted">
          <IntakeInstancesList
            instances={engine.submittedInstances}
            title=""
            emptyMessage="No submitted forms"
            onOpen={setSelectedInstanceId}
            isLoading={engine.isLoading}
          />
        </TabsContent>
        <TabsContent value="finalized">
          <IntakeInstancesList
            instances={engine.finalizedInstances}
            title=""
            emptyMessage="No finalized forms"
            onOpen={setSelectedInstanceId}
            isLoading={engine.isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
