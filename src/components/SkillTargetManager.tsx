import { useState } from 'react';
import { 
  Plus, Target, Edit2, Trash2, CheckCircle2, Clock, 
  TrendingUp, Settings, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Checkbox } from '@/components/ui/checkbox';
import { 
  SkillTarget, 
  SkillAcquisitionMethod, 
  MasteryCriteria,
  MasteryCriteriaType,
} from '@/types/behavior';
import { format } from 'date-fns';
import { ConfirmDialog } from '@/components/ui/alert-dialog-confirm';

interface SkillTargetManagerProps {
  studentId: string;
  skillTargets: SkillTarget[];
  onAddTarget: (target: Omit<SkillTarget, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateTarget: (targetId: string, updates: Partial<SkillTarget>) => void;
  onDeleteTarget: (targetId: string) => void;
  onSelectTarget?: (target: SkillTarget) => void;
}

const METHOD_LABELS: Record<SkillAcquisitionMethod, string> = {
  dtt: 'Discrete Trial Training (DTT)',
  net: 'Natural Environment Teaching (NET)',
  task_analysis: 'Task Analysis',
  probe: 'Probe Data',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  baseline: { label: 'Baseline', color: 'bg-slate-500' },
  acquisition: { label: 'Acquisition', color: 'bg-blue-500' },
  maintenance: { label: 'Maintenance', color: 'bg-green-500' },
  generalization: { label: 'Generalization', color: 'bg-purple-500' },
  mastered: { label: 'Mastered', color: 'bg-emerald-600' },
};

const DOMAIN_OPTIONS = [
  'Communication',
  'Social Skills',
  'Daily Living',
  'Academic',
  'Motor Skills',
  'Play & Leisure',
  'Self-Help',
  'Behavior',
  'Other',
];

export function SkillTargetManager({
  studentId,
  skillTargets,
  onAddTarget,
  onUpdateTarget,
  onDeleteTarget,
  onSelectTarget,
}: SkillTargetManagerProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<SkillTarget | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [definition, setDefinition] = useState('');
  const [domain, setDomain] = useState('');
  const [program, setProgram] = useState('');
  const [method, setMethod] = useState<SkillAcquisitionMethod>('dtt');
  const [status, setStatus] = useState<SkillTarget['status']>('acquisition');
  
  // Mastery criteria
  const [useMasteryCriteria, setUseMasteryCriteria] = useState(true);
  const [criteriaType, setCriteriaType] = useState<MasteryCriteriaType>('percent_correct');
  const [percentCorrect, setPercentCorrect] = useState('80');
  const [consecutiveSessions, setConsecutiveSessions] = useState('3');

  const resetForm = () => {
    setName('');
    setDefinition('');
    setDomain('');
    setProgram('');
    setMethod('dtt');
    setStatus('acquisition');
    setUseMasteryCriteria(true);
    setCriteriaType('percent_correct');
    setPercentCorrect('80');
    setConsecutiveSessions('3');
    setEditTarget(null);
    setShowAddDialog(false);
  };

  const openEditDialog = (target: SkillTarget) => {
    setEditTarget(target);
    setName(target.name);
    setDefinition(target.operationalDefinition || '');
    setDomain(target.domain || '');
    setProgram(target.program || '');
    setMethod(target.method);
    setStatus(target.status);
    
    if (target.masteryCriteria) {
      setUseMasteryCriteria(true);
      setCriteriaType(target.masteryCriteria.type);
      setPercentCorrect(target.masteryCriteria.percentCorrect?.toString() || '80');
      setConsecutiveSessions(target.masteryCriteria.consecutiveSessions?.toString() || '3');
    } else {
      setUseMasteryCriteria(false);
    }
    
    setShowAddDialog(true);
  };

  const handleSave = () => {
    if (!name.trim()) return;

    const masteryCriteria: MasteryCriteria | undefined = useMasteryCriteria ? {
      type: criteriaType,
      percentCorrect: parseInt(percentCorrect) || 80,
      consecutiveSessions: parseInt(consecutiveSessions) || 3,
    } : undefined;

    if (editTarget) {
      onUpdateTarget(editTarget.id, {
        name: name.trim(),
        operationalDefinition: definition.trim() || undefined,
        domain: domain || undefined,
        program: program.trim() || undefined,
        method,
        status,
        masteryCriteria,
        updatedAt: new Date(),
      });
    } else {
      onAddTarget({
        studentId,
        name: name.trim(),
        operationalDefinition: definition.trim() || undefined,
        domain: domain || undefined,
        program: program.trim() || undefined,
        method,
        status,
        masteryCriteria,
      });
    }

    resetForm();
  };

  const handleDelete = () => {
    if (deleteConfirm) {
      onDeleteTarget(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  // Group targets by status
  const groupedTargets = skillTargets.reduce((acc, target) => {
    const status = target.status || 'acquisition';
    if (!acc[status]) acc[status] = [];
    acc[status].push(target);
    return acc;
  }, {} as Record<string, SkillTarget[]>);

  const statusOrder = ['acquisition', 'baseline', 'maintenance', 'generalization', 'mastered'];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Skill Targets
              </CardTitle>
              <CardDescription>
                Manage skill acquisition programs and track progress
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Target
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {skillTargets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No skill targets yet</p>
              <p className="text-xs mt-1">
                Add skill acquisition targets to track DTT, NET, and task analysis data.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {statusOrder.map(statusKey => {
                const targets = groupedTargets[statusKey];
                if (!targets || targets.length === 0) return null;

                const statusInfo = STATUS_LABELS[statusKey];

                return (
                  <div key={statusKey} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className={`${statusInfo.color} text-white text-xs`}>
                        {statusInfo.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        ({targets.length})
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      {targets.map(target => (
                        <div
                          key={target.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => onSelectTarget?.(target)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">
                                {target.name}
                              </span>
                              <Badge variant="outline" className="text-xs shrink-0">
                                {METHOD_LABELS[target.method].split(' ')[0]}
                              </Badge>
                            </div>
                            {target.domain && (
                              <span className="text-xs text-muted-foreground">
                                {target.domain}
                                {target.program && ` • ${target.program}`}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditDialog(target);
                              }}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm(target.id);
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? 'Edit Skill Target' : 'Add Skill Target'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Target Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Request item using sign"
              />
            </div>

            <div className="space-y-2">
              <Label>Operational Definition</Label>
              <Textarea
                value={definition}
                onChange={(e) => setDefinition(e.target.value)}
                placeholder="Define what constitutes a correct response..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Domain</Label>
                <Select value={domain} onValueChange={setDomain}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select domain" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOMAIN_OPTIONS.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Program/Skill Area</Label>
                <Input
                  value={program}
                  onChange={(e) => setProgram(e.target.value)}
                  placeholder="e.g., Manding"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Method</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as SkillAcquisitionMethod)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(METHOD_LABELS) as [SkillAcquisitionMethod, string][]).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as SkillTarget['status'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Mastery Criteria */}
            <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="use-mastery"
                  checked={useMasteryCriteria}
                  onCheckedChange={(checked) => setUseMasteryCriteria(checked === true)}
                />
                <Label htmlFor="use-mastery" className="font-medium cursor-pointer">
                  Set Mastery Criteria
                </Label>
              </div>

              {useMasteryCriteria && (
                <div className="space-y-3 pl-6">
                  <div className="space-y-2">
                    <Label className="text-sm">Criteria Type</Label>
                    <Select value={criteriaType} onValueChange={(v) => setCriteriaType(v as MasteryCriteriaType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent_correct">Percent Correct</SelectItem>
                        <SelectItem value="consecutive_sessions">Consecutive Sessions</SelectItem>
                        <SelectItem value="trend_stability">Trend Stability</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm">% Correct Required</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={percentCorrect}
                        onChange={(e) => setPercentCorrect(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Consecutive Sessions</Label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={consecutiveSessions}
                        onChange={(e) => setConsecutiveSessions(e.target.value)}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Mastery: {percentCorrect}% correct for {consecutiveSessions} consecutive sessions
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!name.trim()}>
              {editTarget ? 'Update' : 'Add'} Target
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Delete Skill Target"
        description="Are you sure you want to delete this skill target? All associated session data will also be removed."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </>
  );
}
