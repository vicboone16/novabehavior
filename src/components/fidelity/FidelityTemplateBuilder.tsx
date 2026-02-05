import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus, Trash2, FileText, Copy, Edit } from 'lucide-react';
import type { FidelityCheckTemplate } from '@/types/treatmentFidelity';
import { v4 as uuidv4 } from 'uuid';

interface FidelityTemplateBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId?: string;
  templates: FidelityCheckTemplate[];
  onCreateTemplate: (data: Omit<FidelityCheckTemplate, 'id' | 'created_at' | 'updated_at'>) => Promise<boolean>;
}

const DEFAULT_FIDELITY_ITEMS = [
  'BIP was reviewed before session',
  'Antecedent strategies were implemented as written',
  'Replacement behaviors were prompted appropriately',
  'Reinforcement was delivered per schedule',
  'Data was collected accurately',
  'Crisis protocol followed if needed',
  'Session ended on positive note',
];

export function FidelityTemplateBuilder({
  open,
  onOpenChange,
  studentId,
  templates,
  onCreateTemplate,
}: FidelityTemplateBuilderProps) {
  const [saving, setSaving] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [items, setItems] = useState<{ id: string; text: string }[]>([]);
  const [newItemText, setNewItemText] = useState('');
  const [showTemplateList, setShowTemplateList] = useState(true);

  const handleAddItem = () => {
    if (!newItemText.trim()) return;
    setItems(prev => [...prev, { id: uuidv4(), text: newItemText.trim() }]);
    setNewItemText('');
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleLoadDefaults = () => {
    setItems(DEFAULT_FIDELITY_ITEMS.map(text => ({ id: uuidv4(), text })));
  };

  const handleDuplicateTemplate = (template: FidelityCheckTemplate) => {
    setTemplateName(`${template.name} (Copy)`);
    setItems(template.items.map(item => ({ id: uuidv4(), text: item.text })));
    setShowTemplateList(false);
  };

  const handleSubmit = async () => {
    if (!templateName.trim() || items.length === 0) return;

    setSaving(true);
    const success = await onCreateTemplate({
      student_id: studentId,
      name: templateName.trim(),
      items: items.map(i => ({ text: i.text })),
      is_active: true,
    });

    setSaving(false);
    if (success) {
      resetForm();
      onOpenChange(false);
    }
  };

  const resetForm = () => {
    setTemplateName('');
    setItems([]);
    setNewItemText('');
    setShowTemplateList(true);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {showTemplateList ? 'Manage Fidelity Templates' : 'Create Template'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {showTemplateList ? (
            <div className="space-y-4 py-4">
              {/* Existing Templates */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Existing Templates</Label>
                {templates.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground bg-muted/30 rounded-lg">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No templates created yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {templates.map(template => (
                      <Card key={template.id} className="border">
                        <CardContent className="p-3 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{template.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {template.items.length} items
                              {template.student_id ? ' • Student-specific' : ' • Global'}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDuplicateTemplate(template)}
                            >
                              <Copy className="h-3.5 w-3.5 mr-1" />
                              Duplicate
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Create New */}
              <Button 
                className="w-full" 
                onClick={() => setShowTemplateList(false)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Template
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {/* Template Name */}
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input
                  placeholder="e.g., BIP Fidelity Check - Aggression"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
              </div>

              {/* Checklist Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Checklist Items</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadDefaults}
                    disabled={items.length > 0}
                  >
                    Load Defaults
                  </Button>
                </div>

                {items.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground bg-muted/30 rounded-lg">
                    <p className="text-sm">No items added yet</p>
                    <p className="text-xs mt-1">Add items or load defaults to get started</p>
                  </div>
                ) : (
                  <div className="space-y-2 border rounded-lg p-3">
                    {items.map((item, idx) => (
                      <div key={item.id} className="flex items-center gap-3 p-2 bg-muted/30 rounded">
                        <Badge variant="secondary" className="text-xs w-6 h-6 p-0 flex items-center justify-center">
                          {idx + 1}
                        </Badge>
                        <p className="text-sm flex-1">{item.text}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add custom item */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a checklist item..."
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                  />
                  <Button variant="outline" size="icon" onClick={handleAddItem}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="border-t pt-4">
          {showTemplateList ? (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setShowTemplateList(true)}>
                Back
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!templateName.trim() || items.length === 0 || saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Template'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
