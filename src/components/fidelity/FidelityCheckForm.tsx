import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, ClipboardCheck, Plus, Trash2 } from 'lucide-react';
import type { FidelityCheckTemplate, FidelityCheckItem } from '@/types/treatmentFidelity';
import { v4 as uuidv4 } from 'uuid';

interface FidelityCheckFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  templates: FidelityCheckTemplate[];
  onSubmit: (data: {
    student_id: string;
    template_id?: string;
    check_date: string;
    items: FidelityCheckItem[];
    items_implemented: number;
    items_total: number;
    setting?: string;
    duration_minutes?: number;
    notes?: string;
    implementer_user_id?: string;
  }) => Promise<boolean>;
}

const SETTINGS = ['Classroom', 'Home', 'Community', 'Clinic', 'Telehealth', 'Other'];

export function FidelityCheckForm({
  open,
  onOpenChange,
  studentId,
  templates,
  onSubmit,
}: FidelityCheckFormProps) {
  const [saving, setSaving] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [checkDate, setCheckDate] = useState(new Date().toISOString().split('T')[0]);
  const [setting, setSetting] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<FidelityCheckItem[]>([]);
  const [newItemText, setNewItemText] = useState('');

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setItems(template.items.map(item => ({
        id: uuidv4(),
        text: item.text,
        implemented: false,
        notes: '',
      })));
    }
  };

  const handleAddItem = () => {
    if (!newItemText.trim()) return;
    setItems(prev => [...prev, {
      id: uuidv4(),
      text: newItemText.trim(),
      implemented: false,
      notes: '',
    }]);
    setNewItemText('');
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleToggleItem = (id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, implemented: !item.implemented } : item
    ));
  };

  const handleItemNotes = (id: string, itemNotes: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, notes: itemNotes } : item
    ));
  };

  const implementedCount = items.filter(i => i.implemented).length;
  const fidelityPercentage = items.length > 0 
    ? Math.round((implementedCount / items.length) * 100) 
    : 0;

  const handleSubmit = async () => {
    if (items.length === 0) return;

    setSaving(true);
    const success = await onSubmit({
      student_id: studentId,
      template_id: selectedTemplateId || undefined,
      check_date: checkDate,
      items,
      items_implemented: implementedCount,
      items_total: items.length,
      setting: setting || undefined,
      duration_minutes: duration ? parseInt(duration, 10) : undefined,
      notes: notes || undefined,
    });

    setSaving(false);
    if (success) {
      resetForm();
      onOpenChange(false);
    }
  };

  const resetForm = () => {
    setSelectedTemplateId('');
    setCheckDate(new Date().toISOString().split('T')[0]);
    setSetting('');
    setDuration('');
    setNotes('');
    setItems([]);
    setNewItemText('');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            New Fidelity Check
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4 py-4">
            {/* Template Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template (Optional)</Label>
                <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Check Date</Label>
                <Input
                  type="date"
                  value={checkDate}
                  onChange={(e) => setCheckDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Setting</Label>
                <Select value={setting} onValueChange={setSetting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select setting..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SETTINGS.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g., 30"
                />
              </div>
            </div>

            {/* Checklist Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Fidelity Checklist</Label>
                {items.length > 0 && (
                  <Badge 
                    variant={fidelityPercentage >= 80 ? 'default' : 'destructive'}
                    className="text-sm"
                  >
                    {implementedCount}/{items.length} ({fidelityPercentage}%)
                  </Badge>
                )}
              </div>

              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Select a template or add items manually below
                </p>
              ) : (
                <div className="space-y-2 border rounded-lg p-3">
                  {items.map((item, idx) => (
                    <div key={item.id} className="flex items-start gap-3 p-2 bg-muted/30 rounded">
                      <Checkbox
                        checked={item.implemented}
                        onCheckedChange={() => handleToggleItem(item.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 space-y-1">
                        <p className={`text-sm ${item.implemented ? 'line-through text-muted-foreground' : ''}`}>
                          {idx + 1}. {item.text}
                        </p>
                        <Input
                          placeholder="Notes for this item..."
                          value={item.notes || ''}
                          onChange={(e) => handleItemNotes(item.id, e.target.value)}
                          className="h-7 text-xs"
                        />
                      </div>
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

            {/* Notes */}
            <div className="space-y-2">
              <Label>Overall Notes</Label>
              <Textarea
                placeholder="Additional observations or feedback..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={items.length === 0 || saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Fidelity Check'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
