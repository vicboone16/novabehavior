import { useState } from 'react';
import { Plus, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { CriteriaBuilder } from './CriteriaBuilder';
import { useCriteriaTemplates } from '@/hooks/useCriteriaEngine';
import {
  type CriteriaScope,
  type CriteriaType,
  type CriteriaRuleJson,
  CRITERIA_TYPE_LABELS,
  generateCriteriaPreview,
  getDefaultCriteriaRule,
} from '@/types/criteriaEngine';

interface CriteriaSettingsPanelProps {
  scope: CriteriaScope;
  scopeId?: string | null;
  title?: string;
}

export function CriteriaSettingsPanel({ scope, scopeId, title }: CriteriaSettingsPanelProps) {
  const { templates, loading, upsertTemplate, deleteTemplate } = useCriteriaTemplates(scope, scopeId);
  const [editingType, setEditingType] = useState<CriteriaType | null>(null);
  const [editName, setEditName] = useState('');
  const [editRule, setEditRule] = useState<CriteriaRuleJson | null>(null);
  const [editActive, setEditActive] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);

  const openEditor = (type: CriteriaType) => {
    const existing = templates.find(t => t.criteria_type === type);
    if (existing) {
      setEditId(existing.id);
      setEditName(existing.name);
      setEditRule(existing.rule_json);
      setEditActive(existing.active);
    } else {
      setEditId(null);
      setEditName(`${CRITERIA_TYPE_LABELS[type]} Criteria`);
      setEditRule(getDefaultCriteriaRule(type));
      setEditActive(true);
    }
    setEditingType(type);
  };

  const handleSave = async () => {
    if (!editingType || !editRule) return;
    await upsertTemplate({
      id: editId || undefined,
      scope,
      scope_id: scopeId || null,
      criteria_type: editingType,
      name: editName,
      rule_json: editRule,
      active: editActive,
      is_default: scope === 'global',
    } as any);
    setEditingType(null);
  };

  const criteriaTypes: CriteriaType[] = ['mastery', 'probe', 'generalization', 'maintenance'];

  if (loading) {
    return <div className="text-sm text-muted-foreground p-4">Loading criteria...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Settings2 className="w-4 h-4" />
          {title || 'Criteria Templates'}
          <Badge variant="outline" className="text-[10px]">{scope}</Badge>
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {criteriaTypes.map(type => {
          const template = templates.find(t => t.criteria_type === type);
          return (
            <Card
              key={type}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => openEditor(type)}
            >
              <CardContent className="py-3">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="secondary" className="text-[10px]">{CRITERIA_TYPE_LABELS[type]}</Badge>
                  {template ? (
                    <Badge variant={template.active ? 'default' : 'outline'} className="text-[10px]">
                      {template.active ? 'Active' : 'Inactive'}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">Inherited</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {template ? generateCriteriaPreview(template.rule_json) : 'Using default criteria'}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Criteria Builder Dialog */}
      <Dialog open={!!editingType} onOpenChange={o => !o && setEditingType(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editId ? 'Edit' : 'Create'} {editingType && CRITERIA_TYPE_LABELS[editingType]} Criteria
            </DialogTitle>
          </DialogHeader>
          {editingType && editRule && (
            <CriteriaBuilder
              criteriaType={editingType}
              value={editRule}
              onChange={setEditRule}
              name={editName}
              onNameChange={setEditName}
              active={editActive}
              onActiveChange={setEditActive}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingType(null)}>Cancel</Button>
            <Button onClick={handleSave}>Save Criteria</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
