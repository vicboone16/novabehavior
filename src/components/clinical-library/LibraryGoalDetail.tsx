import { ArrowLeft, Copy, Check, FileText, Plus } from 'lucide-react';
import { SearchablePersonPicker } from '@/components/ui/searchable-person-picker';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useLibraryGoalObjectives, type LibraryGoal } from '@/hooks/useLibraryRegistry';
import { useCreateGoalDraft } from '@/hooks/useClientLibrary';

interface Props {
  goal: LibraryGoal;
  libraryName: string;
  onBack: () => void;
  clientId?: string;
}

export function LibraryGoalDetail({ goal, libraryName, onBack, clientId }: Props) {
  const { data: objectives = [] } = useLibraryGoalObjectives(goal.id);
  const [copied, setCopied] = useState(false);
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [draftNotes, setDraftNotes] = useState('');
  const [draftClientId, setDraftClientId] = useState(clientId ?? '');
  const createDraft = useCreateGoalDraft();

  const copyGoalText = () => {
    const text = [
      goal.goal_title,
      goal.goal_description,
      goal.suggested_mastery_criteria ? `Mastery: ${goal.suggested_mastery_criteria}` : '',
      objectives.length > 0 ? '\nObjectives:\n' + objectives.map((o, i) => `${i + 1}. ${o.objective_text}`).join('\n') : '',
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Goal copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateDraft = () => {
    if (!draftClientId) {
      toast.error('Client ID is required to create a draft goal');
      return;
    }
    createDraft.mutate({
      clientId: draftClientId,
      sourceLibraryKey: goal.library_key,
      sourceGoalId: goal.id,
      domainKey: goal.domain_key,
      subdomainKey: goal.subdomain_key ?? undefined,
      draftGoalTitle: goal.goal_title,
      draftGoalText: goal.goal_description ?? undefined,
      draftObjectives: objectives.map(o => ({ key: o.objective_key, text: o.objective_text })),
      draftNotes: draftNotes || undefined,
    });
    setShowDraftDialog(false);
    setDraftNotes('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold truncate">{goal.goal_title}</h3>
          <p className="text-xs text-muted-foreground">{libraryName}</p>
        </div>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={copyGoalText}>
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="text-[10px]">{goal.domain_key?.replace(/_/g, ' ')}</Badge>
            {goal.subdomain_key && <Badge variant="secondary" className="text-[10px]">{goal.subdomain_key.replace(/_/g, ' ')}</Badge>}
            {goal.goal_type && <Badge variant="secondary" className="text-[10px]">{goal.goal_type.replace(/_/g, ' ')}</Badge>}
            {goal.age_band_key && <Badge variant="outline" className="text-[10px]">{goal.age_band_key}</Badge>}
            {goal.benchmark_level && <Badge variant="outline" className="text-[10px]">{goal.benchmark_level}</Badge>}
          </div>

          {goal.goal_description && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
              <p className="text-sm">{goal.goal_description}</p>
            </div>
          )}

          {goal.suggested_mastery_criteria && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Suggested Mastery Criteria</p>
              <p className="text-sm">{goal.suggested_mastery_criteria}</p>
            </div>
          )}

          {(goal.tags ?? []).length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Tags</p>
              <div className="flex flex-wrap gap-1">
                {goal.tags!.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-[9px]">{tag}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {objectives.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Objectives ({objectives.length})</p>
            <div className="space-y-2">
              {objectives.map((obj, i) => (
                <div key={obj.id} className="flex items-start gap-2 p-2 rounded border border-border/50 bg-muted/20">
                  <span className="text-xs font-medium text-muted-foreground mt-0.5">{i + 1}.</span>
                  <p className="text-xs flex-1">{obj.objective_text}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => setShowDraftDialog(true)}
        >
          <Plus className="w-3.5 h-3.5" /> Add to Draft Goals
        </Button>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={copyGoalText}>
          <FileText className="w-3.5 h-3.5" /> Copy to IEP
        </Button>
      </div>

      {/* Draft Goal Dialog */}
      <Dialog open={showDraftDialog} onOpenChange={setShowDraftDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Create Draft Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium mb-1">Goal</p>
              <p className="text-sm text-muted-foreground">{goal.goal_title}</p>
            </div>
            <div>
              <p className="text-xs font-medium mb-1">Source</p>
              <Badge variant="outline" className="text-[10px]">{libraryName}</Badge>
            </div>
            {!clientId && (
              <div>
                <p className="text-xs font-medium mb-1">Learner</p>
                <SearchablePersonPicker
                  type="student"
                  value={draftClientId}
                  onChange={setDraftClientId}
                  placeholder="Select learner…"
                />
              </div>
            )}
            <div>
              <p className="text-xs font-medium mb-1">Notes (optional)</p>
              <Textarea
                placeholder="Add clinical notes for this draft..."
                value={draftNotes}
                onChange={e => setDraftNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowDraftDialog(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreateDraft} disabled={createDraft.isPending}>
              {createDraft.isPending ? 'Creating...' : 'Create Draft'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
