import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  useProgramDomains,
  useProgramSubdomains,
  useProgramTags,
  suggestAutoTags,
} from '@/hooks/useProgramDomains';

interface MoveProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programId: string;
  programName: string;
  currentDomainId: string | null;
  onSuccess: () => void;
}

export function MoveProgramDialog({
  open,
  onOpenChange,
  programId,
  programName,
  currentDomainId,
  onSuccess,
}: MoveProgramDialogProps) {
  const [selectedDomainId, setSelectedDomainId] = useState('');
  const [selectedSubdomainId, setSelectedSubdomainId] = useState('');
  const [selectedFrameworkTags, setSelectedFrameworkTags] = useState<string[]>([]);
  const [selectedSourceTags, setSelectedSourceTags] = useState<string[]>([]);
  const [selectedSkillTags, setSelectedSkillTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(false);

  const { data: domains = [] } = useProgramDomains();
  const { data: subdomains = [] } = useProgramSubdomains(
    selectedDomainId && selectedDomainId !== '__none__' ? selectedDomainId : undefined
  );
  const { data: frameworkTags = [] } = useProgramTags('framework_tags');
  const { data: sourceTags = [] } = useProgramTags('source_category_tags');
  const { data: skillTags = [] } = useProgramTags('skill_tags');

  // Auto-suggest on open
  useEffect(() => {
    if (open && !selectedDomainId && domains.length > 0) {
      const suggestion = suggestAutoTags(programName, domains);
      if (suggestion && suggestion.confidence === 'high') {
        setSelectedDomainId(suggestion.domainId);
        setShowSuggestion(true);
      }
    }
  }, [open, programName, domains, selectedDomainId]);

  // Reset subdomain when domain changes
  useEffect(() => {
    setSelectedSubdomainId('');
  }, [selectedDomainId]);

  const handleMove = async () => {
    if (!selectedDomainId) return;
    setLoading(true);

    const domainValue = selectedDomainId === '__none__' ? null : selectedDomainId;
    const subdomainValue = selectedSubdomainId || null;

    const { error } = await supabase
      .from('skill_programs')
      .update({
        top_level_domain_id: domainValue,
        subdomain_id: subdomainValue,
      } as any)
      .eq('id', programId);

    if (error) {
      toast.error('Failed to move program');
      console.error(error);
      setLoading(false);
      return;
    }

    // Save tag links
    const allTagIds = [...selectedFrameworkTags, ...selectedSourceTags, ...selectedSkillTags];
    if (allTagIds.length > 0) {
      const links = allTagIds.map(tagId => ({
        program_id: programId,
        tag_id: tagId,
      }));
      await supabase.from('program_tag_links').upsert(links as any, { onConflict: 'program_id,tag_id' });
    }

    setLoading(false);
    toast.success(`Moved "${programName}" successfully`);
    onOpenChange(false);
    resetForm();
    onSuccess();
  };

  const resetForm = () => {
    setSelectedDomainId('');
    setSelectedSubdomainId('');
    setSelectedFrameworkTags([]);
    setSelectedSourceTags([]);
    setSelectedSkillTags([]);
    setShowSuggestion(false);
  };

  const toggleTag = (tagId: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(tagId) ? list.filter(id => id !== tagId) : [...list, tagId]);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Move Program to Domain</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="text-sm">
            <span className="text-muted-foreground">Program:</span>{' '}
            <span className="font-medium">{programName}</span>
          </div>

          {showSuggestion && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-accent/50 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Auto-suggested domain based on program name</span>
            </div>
          )}

          {/* Domain Selector */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Domain *</label>
            <Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a domain..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No Domain (Unassigned)</SelectItem>
                {domains.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subdomain Selector */}
          {selectedDomainId && selectedDomainId !== '__none__' && subdomains.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Subdomain</label>
              <Select value={selectedSubdomainId} onValueChange={setSelectedSubdomainId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a subdomain (optional)..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none_sub__">No Subdomain</SelectItem>
                  {subdomains.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Framework Tags */}
          <TagSection
            label="Framework Tags"
            tags={frameworkTags}
            selected={selectedFrameworkTags}
            onToggle={(id) => toggleTag(id, selectedFrameworkTags, setSelectedFrameworkTags)}
          />

          {/* Source Category Tags */}
          <TagSection
            label="Source Category Tags"
            tags={sourceTags}
            selected={selectedSourceTags}
            onToggle={(id) => toggleTag(id, selectedSourceTags, setSelectedSourceTags)}
            collapsible
          />

          {/* Skill Tags */}
          <TagSection
            label="Skill Tags"
            tags={skillTags}
            selected={selectedSkillTags}
            onToggle={(id) => toggleTag(id, selectedSkillTags, setSelectedSkillTags)}
            collapsible
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleMove} disabled={!selectedDomainId || loading}>
            {loading ? 'Moving...' : 'Move Program'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TagSection({
  label,
  tags,
  selected,
  onToggle,
  collapsible = false,
}: {
  label: string;
  tags: { id: string; name: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  collapsible?: boolean;
}) {
  const [expanded, setExpanded] = useState(!collapsible);

  if (tags.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        className="text-sm font-medium flex items-center gap-1 hover:text-primary transition-colors"
        onClick={() => collapsible && setExpanded(!expanded)}
      >
        {label}
        {selected.length > 0 && (
          <Badge variant="secondary" className="text-[10px] ml-1">{selected.length}</Badge>
        )}
        {collapsible && (
          <span className="text-xs text-muted-foreground ml-1">
            {expanded ? '▾' : '▸'}
          </span>
        )}
      </button>
      {expanded && (
        <div className="flex flex-wrap gap-1">
          {tags.map(tag => {
            const isSelected = selected.includes(tag.id);
            return (
              <Badge
                key={tag.id}
                variant={isSelected ? 'default' : 'outline'}
                className="cursor-pointer text-[11px] gap-1 transition-colors"
                onClick={() => onToggle(tag.id)}
              >
                {tag.name}
                {isSelected && <X className="w-2.5 h-2.5" />}
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
