import { useState } from 'react';
import { Plus, Trash2, Pencil, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePromptSets } from '@/hooks/useCriteriaEngine';
import type { CriteriaScope, PromptSet, PromptLevelEntry } from '@/types/criteriaEngine';

interface PromptSetManagerProps {
  scope: CriteriaScope;
  scopeId?: string | null;
  title?: string;
}

export function PromptSetManager({ scope, scopeId, title }: PromptSetManagerProps) {
  const { sets, loading, createSet, addLevel, updateLevel, deleteLevel } = usePromptSets(scope, scopeId);
  const [addingLevel, setAddingLevel] = useState<string | null>(null);
  const [newLevelName, setNewLevelName] = useState('');
  const [newLevelAbbr, setNewLevelAbbr] = useState('');
  const [newLevelRank, setNewLevelRank] = useState(6);
  const [newLevelPrompted, setNewLevelPrompted] = useState(true);
  const [creatingSet, setCreatingSet] = useState(false);
  const [newSetName, setNewSetName] = useState('');

  const handleCreateSet = async () => {
    if (!newSetName.trim()) return;
    await createSet({ scope, scope_id: scopeId || null, name: newSetName.trim() });
    setCreatingSet(false);
    setNewSetName('');
  };

  const handleAddLevel = async (setId: string) => {
    if (!newLevelName.trim() || !newLevelAbbr.trim()) return;
    await addLevel(setId, {
      name: newLevelName.trim(),
      abbreviation: newLevelAbbr.trim().toUpperCase(),
      rank: newLevelRank,
      counts_as_prompted: newLevelPrompted,
    });
    setAddingLevel(null);
    setNewLevelName('');
    setNewLevelAbbr('');
    setNewLevelRank(6);
    setNewLevelPrompted(true);
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground p-4">Loading prompt sets...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title || 'Prompt Sets'}</h3>
        <Button variant="outline" size="sm" onClick={() => setCreatingSet(true)}>
          <Plus className="w-3 h-3 mr-1" /> New Set
        </Button>
      </div>

      {sets.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4 border rounded bg-muted/20">
          No prompt sets at this level. Using inherited defaults.
        </p>
      )}

      {sets.map(set => (
        <Card key={set.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm">{set.name}</CardTitle>
                {set.is_default && <Badge variant="secondary" className="text-[10px]">Default</Badge>}
                <Badge variant="outline" className="text-[10px]">{set.scope}</Badge>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setAddingLevel(set.id)}>
                <Plus className="w-3 h-3 mr-1" /> Level
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="grid grid-cols-[40px_1fr_60px_50px_80px_40px] gap-2 text-xs text-muted-foreground font-medium px-1">
                <span>Rank</span>
                <span>Name</span>
                <span>Abbr</span>
                <span>Prmpt</span>
                <span>Active</span>
                <span></span>
              </div>
              {(set.levels || [])
                .filter(l => l.is_active)
                .sort((a, b) => a.rank - b.rank)
                .map(level => (
                  <div key={level.id} className="grid grid-cols-[40px_1fr_60px_50px_80px_40px] gap-2 items-center text-sm px-1 py-1 hover:bg-muted/30 rounded">
                    <span className="text-xs text-muted-foreground">{level.rank}</span>
                    <span>{level.name}</span>
                    <Badge variant="outline" className="text-xs w-fit">{level.abbreviation}</Badge>
                    <span className="text-xs">{level.counts_as_prompted ? '✓' : '—'}</span>
                    <Switch
                      checked={level.is_active}
                      onCheckedChange={v => updateLevel(level.id, { is_active: v })}
                      className="scale-75"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => deleteLevel(level.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Add Level Dialog */}
      <Dialog open={!!addingLevel} onOpenChange={o => !o && setAddingLevel(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Prompt Level</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input value={newLevelName} onChange={e => setNewLevelName(e.target.value)} placeholder="e.g., Visual Prompt" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Abbreviation</Label>
                <Input value={newLevelAbbr} onChange={e => setNewLevelAbbr(e.target.value)} placeholder="e.g., ViP" maxLength={5} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Rank (independence order)</Label>
                <Input type="number" min={0} max={20} value={newLevelRank} onChange={e => setNewLevelRank(Number(e.target.value))} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Counts as prompted?</Label>
              <Switch checked={newLevelPrompted} onCheckedChange={setNewLevelPrompted} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddingLevel(null)}>Cancel</Button>
            <Button onClick={() => addingLevel && handleAddLevel(addingLevel)} disabled={!newLevelName.trim() || !newLevelAbbr.trim()}>
              Add Level
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Set Dialog */}
      <Dialog open={creatingSet} onOpenChange={setCreatingSet}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Prompt Set</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Set Name</Label>
              <Input value={newSetName} onChange={e => setNewSetName(e.target.value)} placeholder="e.g., Custom Prompt Set" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatingSet(false)}>Cancel</Button>
            <Button onClick={handleCreateSet} disabled={!newSetName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
