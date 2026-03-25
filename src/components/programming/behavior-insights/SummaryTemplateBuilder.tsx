import { useState } from 'react';
import { Settings2, GripVertical, Eye, EyeOff, Trash2, Plus, Save, ArrowUp, ArrowDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useTemplateStore, type TemplateSection } from './useTemplateStore';
import type { ToneProfile } from './summaryEngine';

interface SummaryTemplateBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AVAILABLE_SECTIONS: { key: string; label: string }[] = [
  { key: 'student_header', label: 'Student Header' },
  { key: 'date_range', label: 'Date Range' },
  { key: 'behavior_percentages', label: 'Behavior Percentages' },
  { key: 'top_behaviors', label: 'Top Behaviors' },
  { key: 'fba_summary', label: 'FBA-Style Summary' },
  { key: 'clinical_interpretation', label: 'Clinical Interpretation' },
  { key: 'antecedents', label: 'Antecedents' },
  { key: 'consequences', label: 'Consequences' },
  { key: 'setting_events', label: 'Setting Events' },
  { key: 'escalation_chain', label: 'Escalation Chain' },
  { key: 'replacement_skills', label: 'Replacement Skills' },
  { key: 'intervention_focus', label: 'Intervention Focus' },
  { key: 'staff_response', label: 'Staff Response' },
  { key: 'reinforcement_focus', label: 'Reinforcement Focus' },
  { key: 'graph_snapshot', label: 'Graph Snapshot' },
  { key: 'table_snapshot', label: 'Table Snapshot' },
  { key: 'data_quality_note', label: 'Data Quality Note' },
  { key: 'recommendations', label: 'Recommendations' },
  { key: 'custom_text', label: 'Custom Text Block' },
];

export function SummaryTemplateBuilder({ open, onOpenChange }: SummaryTemplateBuilderProps) {
  const {
    templateName, setTemplateName,
    audienceType, setAudienceType,
    sections, setSections,
    updateSection, removeSection, toggleSection, moveSection,
  } = useTemplateStore();

  const [localSelectedKey, setLocalSelectedKey] = useState<string | null>(null);
  const selectedSection = sections.find(s => s.key === localSelectedKey);

  const addSection = (key: string) => {
    const def = AVAILABLE_SECTIONS.find(s => s.key === key);
    if (!def || sections.some(s => s.key === key)) return;
    useTemplateStore.getState().addSection({
      key,
      label: def.label,
      enabled: true,
      required: false,
      contentMode: 'hybrid',
      tone: 'clinical' as ToneProfile,
      formatStyle: 'paragraph',
      promptInstructions: '',
      fallbackText: '',
    });
  };

  const handleSave = () => {
    toast.success(`Template "${templateName}" saved`);
    onOpenChange(false);
  };

  const unusedSections = AVAILABLE_SECTIONS.filter(s => !sections.some(a => a.key === s.key));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Settings2 className="w-4 h-4" /> Summary Template Builder
          </DialogTitle>
        </DialogHeader>

        {/* Template Meta */}
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <Label className="text-xs">Template Name</Label>
            <Input value={templateName} onChange={e => setTemplateName(e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div className="w-40">
            <Label className="text-xs">Audience</Label>
            <Select value={audienceType} onValueChange={setAudienceType}>
              <SelectTrigger className="h-8 text-xs mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="teacher" className="text-xs">Teacher</SelectItem>
                <SelectItem value="bcba" className="text-xs">BCBA</SelectItem>
                <SelectItem value="parent" className="text-xs">Parent</SelectItem>
                <SelectItem value="team" className="text-xs">Team Meeting</SelectItem>
                <SelectItem value="fba_bip" className="text-xs">FBA/BIP</SelectItem>
                <SelectItem value="custom" className="text-xs">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="flex gap-3 flex-1 min-h-0 mt-2">
          {/* Left: Active sections */}
          <div className="flex-1 border rounded-lg overflow-hidden flex flex-col">
            <div className="text-xs font-semibold px-3 py-2 bg-muted/30 border-b">Active Sections</div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {sections.map((section, i) => (
                  <div
                    key={section.key}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded border text-xs cursor-pointer transition-colors ${
                      localSelectedKey === section.key ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/40'
                    } ${!section.enabled ? 'opacity-50' : ''}`}
                    onClick={() => setLocalSelectedKey(section.key)}
                  >
                    <div className="flex flex-col gap-0.5">
                      <Button variant="ghost" size="icon" className="h-3 w-3 p-0" onClick={e => { e.stopPropagation(); moveSection(section.key, -1); }}>
                        <ArrowUp className="w-2.5 h-2.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-3 w-3 p-0" onClick={e => { e.stopPropagation(); moveSection(section.key, 1); }}>
                        <ArrowDown className="w-2.5 h-2.5" />
                      </Button>
                    </div>
                    <span className="flex-1 truncate font-medium">{section.label}</span>
                    {section.required && <Badge variant="secondary" className="text-[8px] px-1">Required</Badge>}
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={e => { e.stopPropagation(); toggleSection(section.key); }}>
                      {section.enabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </Button>
                    {!section.required && (
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={e => { e.stopPropagation(); removeSection(section.key); }}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {unusedSections.length > 0 && (
              <div className="border-t p-2">
                <Select onValueChange={addSection}>
                  <SelectTrigger className="h-7 text-[10px]">
                    <Plus className="w-3 h-3 mr-1" />
                    <span>Add Section</span>
                  </SelectTrigger>
                  <SelectContent>
                    {unusedSections.map(s => (
                      <SelectItem key={s.key} value={s.key} className="text-xs">{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Right: Section config */}
          <div className="w-64 border rounded-lg overflow-hidden flex flex-col">
            <div className="text-xs font-semibold px-3 py-2 bg-muted/30 border-b">Section Settings</div>
            {selectedSection ? (
              <ScrollArea className="flex-1 p-3 space-y-3">
                <div className="space-y-3">
                  <div>
                    <Label className="text-[10px]">Display Label</Label>
                    <Input
                      value={selectedSection.label}
                      onChange={e => updateSection(selectedSection.key, { label: e.target.value })}
                      className="h-7 text-xs mt-0.5"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">Content Mode</Label>
                    <Select value={selectedSection.contentMode} onValueChange={v => updateSection(selectedSection.key, { contentMode: v as TemplateSection['contentMode'] })}>
                      <SelectTrigger className="h-7 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto_generated" className="text-xs">Auto-generated</SelectItem>
                        <SelectItem value="manual" className="text-xs">Manual</SelectItem>
                        <SelectItem value="hybrid" className="text-xs">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px]">Tone</Label>
                    <Select value={selectedSection.tone} onValueChange={v => updateSection(selectedSection.key, { tone: v as ToneProfile })}>
                      <SelectTrigger className="h-7 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clinical" className="text-xs">Clinical</SelectItem>
                        <SelectItem value="teacher_friendly" className="text-xs">Teacher-Friendly</SelectItem>
                        <SelectItem value="parent_friendly" className="text-xs">Parent-Friendly</SelectItem>
                        <SelectItem value="concise" className="text-xs">Concise</SelectItem>
                        <SelectItem value="detailed" className="text-xs">Detailed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px]">Format</Label>
                    <Select value={selectedSection.formatStyle} onValueChange={v => updateSection(selectedSection.key, { formatStyle: v as TemplateSection['formatStyle'] })}>
                      <SelectTrigger className="h-7 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paragraph" className="text-xs">Paragraph</SelectItem>
                        <SelectItem value="bullets" className="text-xs">Bullets</SelectItem>
                        <SelectItem value="checklist" className="text-xs">Checklist</SelectItem>
                        <SelectItem value="card" className="text-xs">Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px]">Prompt Instructions</Label>
                    <Textarea
                      value={selectedSection.promptInstructions}
                      onChange={e => updateSection(selectedSection.key, { promptInstructions: e.target.value })}
                      className="text-xs min-h-[50px] mt-0.5"
                      rows={2}
                      placeholder="e.g. Use cautious clinical phrasing."
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">Fallback Text</Label>
                    <Input
                      value={selectedSection.fallbackText}
                      onChange={e => updateSection(selectedSection.key, { fallbackText: e.target.value })}
                      className="h-7 text-xs mt-0.5"
                      placeholder="Shown when no data available"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px]">Required</Label>
                    <Switch
                      checked={selectedSection.required}
                      onCheckedChange={v => updateSection(selectedSection.key, { required: v })}
                    />
                  </div>
                </div>
              </ScrollArea>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground p-4 text-center">
                Select a section to configure
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} className="gap-1">
            <Save className="w-3.5 h-3.5" /> Save Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
