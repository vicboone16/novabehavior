import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Pencil, Archive, ExternalLink, BookOpen } from 'lucide-react';
import type { BehaviorStrategy, StrategyStep, StrategyTrainingLink } from '@/hooks/useBehaviorStrategyLibrary';

interface Props {
  strategy: BehaviorStrategy | null;
  steps: StrategyStep[];
  trainingLinks: StrategyTrainingLink[];
  canEdit: boolean;
  open: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onArchive?: () => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      {children}
    </div>
  );
}

function JsonList({ data, emptyText }: { data: any; emptyText: string }) {
  if (!data) return <p className="text-xs text-muted-foreground italic">{emptyText}</p>;
  const items = Array.isArray(data) ? data : typeof data === 'object' ? Object.values(data) : [String(data)];
  if (items.length === 0) return <p className="text-xs text-muted-foreground italic">{emptyText}</p>;
  return (
    <ul className="list-disc pl-4 space-y-0.5">
      {items.map((item, i) => <li key={i} className="text-xs">{typeof item === 'string' ? item : JSON.stringify(item)}</li>)}
    </ul>
  );
}

export function StrategyDetailDrawer({ strategy, steps, trainingLinks, canEdit, open, onClose, onEdit, onArchive }: Props) {
  if (!strategy) return null;

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg p-0">
        <SheetHeader className="p-4 pb-2">
          <SheetTitle className="text-base">{strategy.strategy_name.replace('[ARCHIVED] ', '')}</SheetTitle>
          <div className="flex flex-wrap gap-1">
            {strategy.strategy_group && <Badge variant="secondary" className="text-[10px] capitalize">{strategy.strategy_group.replace(/_/g, ' ')}</Badge>}
            {strategy.category && <Badge variant="outline" className="text-[10px]">{strategy.category}</Badge>}
            {strategy.evidence_level && <Badge variant="outline" className="text-[10px]">{strategy.evidence_level.replace('_', ' ')}</Badge>}
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)] px-4 pb-6">
          <div className="space-y-4">
            {/* Overview */}
            {strategy.description && (
              <Section title="Description">
                <p className="text-sm">{strategy.description}</p>
              </Section>
            )}

            <Separator />

            {/* Quick Use */}
            {(strategy.teacher_quick_version || strategy.family_version) && (
              <>
                <Section title="Quick Use Versions">
                  {strategy.teacher_quick_version && (
                    <div className="bg-muted/50 rounded-md p-2">
                      <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">Teacher Version</p>
                      <p className="text-xs">{strategy.teacher_quick_version}</p>
                    </div>
                  )}
                  {strategy.family_version && (
                    <div className="bg-muted/50 rounded-md p-2 mt-1">
                      <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">Family Version</p>
                      <p className="text-xs">{strategy.family_version}</p>
                    </div>
                  )}
                </Section>
                <Separator />
              </>
            )}

            {/* Targets */}
            <Section title="Targets">
              <div className="space-y-1">
                {strategy.function_targets?.length ? (
                  <div>
                    <p className="text-[10px] text-muted-foreground">Functions</p>
                    <div className="flex flex-wrap gap-1">{strategy.function_targets.map(f => <Badge key={f} variant="secondary" className="text-[10px]">{f}</Badge>)}</div>
                  </div>
                ) : null}
                {strategy.escalation_levels?.length ? (
                  <div>
                    <p className="text-[10px] text-muted-foreground">Escalation</p>
                    <div className="flex flex-wrap gap-1">{strategy.escalation_levels.map(e => <Badge key={e} variant="outline" className="text-[10px]">{e}</Badge>)}</div>
                  </div>
                ) : null}
                {strategy.environments?.length ? (
                  <div>
                    <p className="text-[10px] text-muted-foreground">Environments</p>
                    <div className="flex flex-wrap gap-1">{strategy.environments.map(e => <Badge key={e} variant="outline" className="text-[10px]">{e}</Badge>)}</div>
                  </div>
                ) : null}
              </div>
            </Section>

            <Separator />

            {/* Data to Collect */}
            <Section title="Data to Collect">
              <JsonList data={strategy.data_to_collect} emptyText="No data collection specified" />
            </Section>

            <Separator />

            {/* Fidelity Tips */}
            <Section title="Fidelity Tips">
              <JsonList data={strategy.fidelity_tips} emptyText="No fidelity tips yet" />
            </Section>

            <Separator />

            {/* Staff Scripts */}
            <Section title="Staff Scripts">
              <JsonList data={strategy.staff_scripts} emptyText="No staff scripts yet" />
            </Section>

            <Separator />

            {/* Implementation Steps */}
            <Section title="Implementation Steps">
              {steps.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Implementation steps coming soon</p>
              ) : (
                <ol className="list-decimal pl-4 space-y-1">
                  {steps.map(s => (
                    <li key={s.id} className="text-xs">{s.step_description || '(no description)'}</li>
                  ))}
                </ol>
              )}
            </Section>

            <Separator />

            {/* Related Training */}
            <Section title="Related Training">
              {trainingLinks.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No linked training yet</p>
              ) : (
                <div className="space-y-1">
                  {trainingLinks.map(link => (
                    <div key={link.id} className="flex items-center gap-2 text-xs bg-muted/50 rounded p-1.5">
                      <BookOpen className="h-3 w-3 text-muted-foreground" />
                      <span>{link.module_key || link.academy_module_id || 'Training Module'}</span>
                      <Button variant="ghost" size="sm" className="h-5 ml-auto text-[10px]">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Actions */}
            {canEdit && (
              <>
                <Separator />
                <div className="flex gap-2">
                  {onEdit && (
                    <Button size="sm" variant="outline" onClick={onEdit}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit Strategy
                    </Button>
                  )}
                  {onArchive && (
                    <Button size="sm" variant="destructive" onClick={onArchive}>
                      <Archive className="h-3.5 w-3.5 mr-1" /> Archive
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
