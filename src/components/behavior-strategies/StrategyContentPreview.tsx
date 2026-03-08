import { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ChevronDown, ChevronUp, CheckCircle2, XCircle, Loader2, Sparkles,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/* ── types ── */

export interface StrategyExportPayload {
  selectedStrategies: Array<{ id: string; name: string; group: string | null }>;
  clinicalNarrative: string | null;
  teacherSummary: string | null;
  caregiverSummary: string | null;
  mappedSections: Array<{ sectionKey: string; content: string; narrativeType: string }>;
  includeStrategySections: boolean;
}

interface StrategyContentPreviewProps {
  reportId: string;
  reportType: 'fba' | 'bip';
  includeStrategySections: boolean;
  onToggleInclude: (val: boolean) => void;
  /** Callback with assembled payload for the export engine */
  onPayloadReady?: (payload: StrategyExportPayload) => void;
}

/* ── component ── */

export function StrategyContentPreview({
  reportId,
  reportType,
  includeStrategySections,
  onToggleInclude,
  onPayloadReady,
}: StrategyContentPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [strategyCount, setStrategyCount] = useState(0);
  const [hasClinical, setHasClinical] = useState(false);
  const [hasTeacher, setHasTeacher] = useState(false);
  const [hasCaregiver, setHasCaregiver] = useState(false);
  const [mappedKeys, setMappedKeys] = useState<string[]>([]);
  const [payload, setPayload] = useState<StrategyExportPayload | null>(null);

  const loadPreview = useCallback(async () => {
    if (!reportId) return;
    setLoading(true);
    try {
      // 1. Selected strategies
      const { data: selections } = await (supabase.from as any)('report_strategy_selections')
        .select('strategy_id')
        .eq('report_id', reportId);
      const selCount = selections?.length || 0;
      setStrategyCount(selCount);

      let strategies: StrategyExportPayload['selectedStrategies'] = [];
      if (selections?.length) {
        const ids = selections.map((s: any) => s.strategy_id);
        const { data: strats } = await supabase
          .from('behavior_strategies')
          .select('id, strategy_name, strategy_group')
          .in('id', ids);
        strategies = (strats || []).map((s: any) => ({
          id: s.id,
          name: s.strategy_name,
          group: s.strategy_group,
        }));
      }

      // 2. Narratives
      const { data: narratives } = await supabase
        .from('report_strategy_narratives')
        .select('narrative_type, generated_text')
        .eq('report_id', reportId);

      let clinical: string | null = null;
      let teacher: string | null = null;
      let caregiver: string | null = null;
      (narratives || []).forEach((n: any) => {
        if (n.narrative_type === 'clinical') clinical = n.generated_text;
        if (n.narrative_type === 'teacher') teacher = n.generated_text;
        if (n.narrative_type === 'caregiver') caregiver = n.generated_text;
      });
      setHasClinical(!!clinical);
      setHasTeacher(!!teacher);
      setHasCaregiver(!!caregiver);

      // 3. Mapped section content
      const { data: sectionContent } = await (supabase.from as any)('report_strategy_section_content')
        .select('section_key, content, narrative_type')
        .eq('report_id', reportId);

      const mapped = (sectionContent || []).map((sc: any) => ({
        sectionKey: sc.section_key,
        content: sc.content,
        narrativeType: sc.narrative_type,
      }));
      setMappedKeys(mapped.map((m: any) => m.sectionKey));

      // Use section content to override narratives if available
      const sectionClinical = mapped.find((m: any) => m.narrativeType === 'clinical')?.content;
      const sectionTeacher = mapped.find((m: any) => m.narrativeType === 'teacher')?.content;
      const sectionCaregiver = mapped.find((m: any) => m.narrativeType === 'caregiver')?.content;

      const finalPayload: StrategyExportPayload = {
        selectedStrategies: strategies,
        clinicalNarrative: sectionClinical || clinical,
        teacherSummary: sectionTeacher || teacher,
        caregiverSummary: sectionCaregiver || caregiver,
        mappedSections: mapped,
        includeStrategySections,
      };
      setPayload(finalPayload);
      onPayloadReady?.(finalPayload);

      // Auto-enable if content exists
      if (selCount > 0 || clinical || teacher || caregiver || mapped.length) {
        if (!includeStrategySections) {
          // Don't force-enable, just suggest
        }
      }
    } catch (err: any) {
      console.error('Failed to load strategy content preview:', err.message);
    } finally {
      setLoading(false);
    }
  }, [reportId, includeStrategySections, onPayloadReady]);

  useEffect(() => {
    if (isOpen && reportId) loadPreview();
  }, [isOpen, reportId, loadPreview]);

  // Update payload include flag
  useEffect(() => {
    if (payload) {
      const updated = { ...payload, includeStrategySections };
      setPayload(updated);
      onPayloadReady?.(updated);
    }
  }, [includeStrategySections]);

  const hasAnyContent = strategyCount > 0 || hasClinical || hasTeacher || hasCaregiver || mappedKeys.length > 0;

  const indicator = (has: boolean, label: string) => (
    <div className="flex items-center gap-1.5 text-xs">
      {has ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
      )}
      <span className={has ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
    </div>
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Strategy Content Preview
                {hasAnyContent && !loading && (
                  <Badge variant="secondary" className="text-xs">Content available</Badge>
                )}
              </CardTitle>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
            <CardDescription className="text-xs">
              Preview strategy-based sections before export
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-3 pt-0">
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Toggle */}
                <div className="flex items-center justify-between p-2 border rounded-md bg-muted/30">
                  <Label htmlFor="include-strategy" className="text-xs cursor-pointer">
                    Include strategy-based sections in export
                  </Label>
                  <Switch
                    id="include-strategy"
                    checked={includeStrategySections}
                    onCheckedChange={onToggleInclude}
                  />
                </div>

                {/* Status indicators */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 border rounded-md space-y-1.5">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase">Content</p>
                    {indicator(strategyCount > 0, `${strategyCount} selected strategies`)}
                    {indicator(hasClinical, 'Clinical narrative')}
                    {indicator(hasTeacher, 'Teacher summary')}
                    {indicator(hasCaregiver, 'Caregiver summary')}
                  </div>
                  <div className="p-2 border rounded-md space-y-1.5">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase">Mapped Sections</p>
                    {mappedKeys.length > 0 ? (
                      mappedKeys.map(k => (
                        <Badge key={k} variant="outline" className="text-[10px] mr-1">
                          {k.replace(/_/g, ' ')}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">No mapped sections</p>
                    )}
                  </div>
                </div>

                {!hasAnyContent && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    No strategy content exists for this report. Export will proceed normally without strategy sections.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
