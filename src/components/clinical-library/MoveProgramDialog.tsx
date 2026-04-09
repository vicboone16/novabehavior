import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Lightbulb, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useProgramDomains, useProgramSubdomains, useProgramTags, suggestAutoTags } from '@/hooks/useProgramDomains';

export interface MoveProgramTarget {
  id: string;
  name: string;
  domain_id: string;
  subdomain_id: string | null;
  domain_name: string;
  subdomain_name: string | null;
}

interface Props {
  program: MoveProgramTarget | MoveProgramTarget[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMoved: () => void;
}

export function MoveProgramDialog({ program, open, onOpenChange, onMoved }: Props) {
  const programs = Array.isArray(program) ? program : [program];
  const isBulk = programs.length > 1;
  const first = programs[0];

  const [newDomainId, setNewDomainId] = useState('');
  const [newSubdomainId, setNewSubdomainId] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: domains = [] } = useProgramDomains();
  const { data: subdomains = [] } = useProgramSubdomains(newDomainId || undefined);
  const { data: tags = [] } = useProgramTags('framework-tags');
  const queryClient = useQueryClient();

  const suggestion = !isBulk ? suggestAutoTags(first.name, domains) : null;

  const newDomainName = domains.find(d => d.id === newDomainId)?.name || '';
  const newSubdomainName = subdomains.find(s => s.id === newSubdomainId)?.name || '';

  const isSameLocation = !isBulk && newDomainId === first.domain_id && newSubdomainId === (first.subdomain_id || '');

  useEffect(() => {
    if (!open) {
      setNewDomainId('');
      setNewSubdomainId('');
      setSelectedTagIds([]);
      setNotes('');
    }
  }, [open]);

  const handleUseSuggestion = () => {
    if (suggestion) {
      setNewDomainId(suggestion.domainId);
      setNewSubdomainId('');
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
    );
  };

  const handleSubmit = async () => {
    if (!newDomainId) {
      toast.error('Please select a target domain');
      return;
    }
    setSubmitting(true);

    try {
      for (const prog of programs) {
        // Update the program
        const { error: updateError } = await supabase
          .from('library_programs')
          .update({
            domain_id: newDomainId,
            subdomain_id: newSubdomainId || null,
          })
          .eq('id', prog.id);

        if (updateError) throw updateError;

        // Insert audit log
        const { error: logError } = await supabase
          .from('program_domain_migration_log')
          .insert({
            program_id: prog.id,
            old_domain_id: prog.domain_id,
            old_domain_name: prog.domain_name,
            new_domain_id: newDomainId,
            new_domain_name: newDomainName,
            new_subdomain_id: newSubdomainId || null,
            new_subdomain_name: newSubdomainName || null,
            tags_added: selectedTagIds.length > 0
              ? tags.filter(t => selectedTagIds.includes(t.id)).map(t => t.name)
              : null,
            confidence: 'manual',
            migration_source: 'user_move',
            needs_review: false,
          });

        if (logError) throw logError;

        // Insert tag links
        for (const tagId of selectedTagIds) {
          await supabase
            .from('program_tag_links')
            .upsert({ program_id: prog.id, tag_id: tagId }, { onConflict: 'program_id,tag_id' });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['library-programs'] });
      queryClient.invalidateQueries({ queryKey: ['domain-migration-log'] });

      const label = isBulk
        ? `Moved ${programs.length} programs to ${newDomainName}${newSubdomainName ? ` → ${newSubdomainName}` : ''}`
        : `Moved "${first.name}" to ${newDomainName}${newSubdomainName ? ` → ${newSubdomainName}` : ''}`;
      toast.success(label);

      onOpenChange(false);
      onMoved();
    } catch (e: any) {
      toast.error('Move failed: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {isBulk ? `Move ${programs.length} Programs` : `Move Program`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Current location */}
          {!isBulk && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Currently in</p>
              <div className="flex items-center gap-2 text-sm font-medium">
                <span>{first.domain_name}</span>
                {first.subdomain_name && (
                  <>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <span>{first.subdomain_name}</span>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{first.name}</p>
            </div>
          )}

          {isBulk && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Selected programs</p>
              <div className="flex flex-wrap gap-1">
                {programs.slice(0, 8).map(p => (
                  <Badge key={p.id} variant="outline" className="text-[10px]">{p.name}</Badge>
                ))}
                {programs.length > 8 && (
                  <Badge variant="secondary" className="text-[10px]">+{programs.length - 8} more</Badge>
                )}
              </div>
            </div>
          )}

          {/* Auto-suggestion */}
          {suggestion && !newDomainId && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-primary/20 bg-primary/5">
              <Lightbulb className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs">
                  Suggested: <span className="font-medium">{suggestion.domainName}</span>
                  <span className="text-muted-foreground ml-1">({suggestion.confidence})</span>
                </p>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleUseSuggestion}>
                Use suggestion
              </Button>
            </div>
          )}

          {/* Domain select */}
          <div>
            <Label className="text-xs">New Domain *</Label>
            <Select value={newDomainId} onValueChange={v => { setNewDomainId(v); setNewSubdomainId(''); }}>
              <SelectTrigger className="h-9 mt-1">
                <SelectValue placeholder="Select domain…" />
              </SelectTrigger>
              <SelectContent>
                {domains.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subdomain select */}
          <div>
            <Label className="text-xs">New Subdomain</Label>
            <Select
              value={newSubdomainId}
              onValueChange={setNewSubdomainId}
              disabled={!newDomainId}
            >
              <SelectTrigger className="h-9 mt-1">
                <SelectValue placeholder={newDomainId ? 'Select subdomain…' : 'Select domain first'} />
              </SelectTrigger>
              <SelectContent>
                {subdomains.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div>
              <Label className="text-xs">Tags to add (optional)</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {tags.map(tag => (
                  <label key={tag.id} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <Checkbox
                      checked={selectedTagIds.includes(tag.id)}
                      onCheckedChange={() => toggleTag(tag.id)}
                    />
                    {tag.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Reason for moving this program…"
              rows={2}
              className="mt-1"
            />
          </div>

          {/* Warning */}
          {isSameLocation && (
            <p className="text-xs text-amber-600">⚠ This program is already in the selected domain/subdomain.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!newDomainId || submitting || isSameLocation}
          >
            {submitting ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Moving…</> : isBulk ? `Move ${programs.length} Programs` : 'Move Program'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
