import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  CheckCircle2,
  XCircle,
  Pencil,
  AlertTriangle,
  Target,
  Plus,
  CheckCheck,
  XOctagon,
  Save,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Search,
  Check,
} from 'lucide-react';
import type { NovaAction } from './NovaAIActionButtons';

// ── Types ──

interface ParsedItem {
  item_id: string;
  item_type: string;
  raw_text: string;
  target_match: {
    match_status: string;
    target_id?: string;
    target_name?: string;
    target_type?: string;
    match_confidence: number;
    alternate_matches?: { target_id: string; target_name: string; confidence: number }[];
  };
  measurement: {
    measurement_type: string;
    frequency_count?: number;
    duration_seconds?: number;
    latency_seconds?: number;
    interval_occurrence?: number;
    interval_total?: number;
    trial_correct?: number;
    trial_total?: number;
    percent_value?: number;
    rate_per_minute?: number;
    observation_window_minutes?: number;
    raw_value_text?: string;
  };
  prompting?: {
    prompt_level?: string;
    independence_level?: string;
  };
  context?: {
    antecedent?: string;
    behavior_description?: string;
    consequence?: string;
    notes?: string;
    setting?: string;
  };
  quality: {
    confidence: number;
    is_inferred?: boolean;
    needs_review?: boolean;
    warning_codes?: string[];
  };
}

type ItemDecision = 'approved' | 'rejected' | 'pending';

interface ItemReviewState {
  decision: ItemDecision;
  editedValues: Partial<ParsedItem['measurement']>;
  remappedTargetId?: string;
  remappedTargetName?: string;
  createNewTarget?: boolean;
  newTargetName?: string;
  newTargetType?: string;
}

interface AvailableTarget {
  id: string;
  title: string;
  data_collection_type?: string;
  status: string;
}

interface NovaAIReviewPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: NovaAction | null;
  clientId: string | null;
  onSaveApproved: (action: NovaAction, destination: string) => Promise<boolean>;
}

// ── Helpers ──

const MATCH_BADGES: Record<string, { className: string; label: string }> = {
  matched_existing_target: { className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400', label: '✓ Matched' },
  matched_existing_target_via_alias: { className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', label: '✓ Alias' },
  ambiguous_match_review_needed: { className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', label: '⚠ Review' },
  no_match_new_target_suggested: { className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', label: '+ New' },
};

const MEASUREMENT_LABELS: Record<string, string> = {
  frequency: 'Frequency',
  duration: 'Duration',
  latency: 'Latency',
  interval: 'Interval',
  trial_based: 'Trial-Based',
  abc: 'ABC Event',
  rate: 'Rate',
  narrative_only: 'Narrative',
};

// ── Searchable Target Dropdown ──

function SearchableTargetDropdown({
  targets,
  selectedId,
  onSelect,
}: {
  targets: AvailableTarget[];
  selectedId: string;
  onSelect: (id: string, name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () =>
      targets.filter(
        (t) =>
          t.title.toLowerCase().includes(search.toLowerCase()) ||
          (t.data_collection_type || '').toLowerCase().includes(search.toLowerCase())
      ),
    [targets, search]
  );

  const selectedTarget = targets.find((t) => t.id === selectedId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 w-full justify-between text-xs font-normal"
        >
          <span className="truncate">
            {selectedTarget ? selectedTarget.title : 'Select a target...'}
          </span>
          <ChevronDown className="w-3 h-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="flex items-center gap-2 px-2.5 py-2 border-b border-border">
          <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Search targets..."
            className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        <ScrollArea className="max-h-48">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground px-3 py-4 text-center">
              No targets found
            </p>
          ) : (
            <div className="p-1">
              {filtered.map((t) => (
                <button
                  key={t.id}
                  className={`w-full text-left flex items-center gap-2 px-2 py-1.5 text-xs rounded-sm hover:bg-accent transition-colors ${
                    t.id === selectedId ? 'bg-accent font-medium' : ''
                  }`}
                  onClick={() => {
                    onSelect(t.id, t.title);
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  <Check
                    className={`w-3 h-3 shrink-0 ${
                      t.id === selectedId ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                  <span className="truncate">{t.title}</span>
                  {t.data_collection_type && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 ml-auto shrink-0">
                      {t.data_collection_type}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

// ── Component ──

export function NovaAIReviewPanel({
  open,
  onOpenChange,
  action,
  clientId,
  onSaveApproved,
}: NovaAIReviewPanelProps) {
  const behaviors: ParsedItem[] = action?.data?.behaviors || [];
  const [reviewStates, setReviewStates] = useState<Map<string, ItemReviewState>>(new Map());
  const [availableTargets, setAvailableTargets] = useState<AvailableTarget[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // Load available targets for remap dropdown
  useEffect(() => {
    if (!open || !clientId) return;
    (async () => {
      const { data } = await supabase
        .from('student_targets')
        .select('id, title, data_collection_type, status')
        .eq('student_id', clientId)
        .eq('status', 'active')
        .order('title');
      setAvailableTargets(data || []);
    })();
  }, [open, clientId]);

  // Init review states when action changes
  useEffect(() => {
    if (!behaviors.length) return;
    const initial = new Map<string, ItemReviewState>();
    for (const item of behaviors) {
      const needsReview = item.quality?.needs_review ||
        item.target_match?.match_status === 'ambiguous_match_review_needed' ||
        item.target_match?.match_status === 'no_match_new_target_suggested';
      initial.set(item.item_id, {
        decision: needsReview ? 'pending' : 'approved',
        editedValues: {},
      });
    }
    setReviewStates(initial);
    // Auto-expand items needing review
    const needReview = new Set(
      behaviors
        .filter(b => b.quality?.needs_review || b.target_match?.match_status === 'ambiguous_match_review_needed')
        .map(b => b.item_id)
    );
    setExpandedItems(needReview);
  }, [action]);

  const updateState = useCallback((itemId: string, update: Partial<ItemReviewState>) => {
    setReviewStates(prev => {
      const next = new Map(prev);
      const current = next.get(itemId) || { decision: 'pending', editedValues: {} };
      next.set(itemId, { ...current, ...update });
      return next;
    });
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Bulk actions
  const approveAll = () => {
    setReviewStates(prev => {
      const next = new Map(prev);
      for (const [id, state] of next) {
        if (state.decision !== 'rejected') {
          next.set(id, { ...state, decision: 'approved' });
        }
      }
      return next;
    });
  };

  const rejectAll = () => {
    setReviewStates(prev => {
      const next = new Map(prev);
      for (const [id, state] of next) {
        next.set(id, { ...state, decision: 'rejected' });
      }
      return next;
    });
  };

  const resetAll = () => {
    const initial = new Map<string, ItemReviewState>();
    for (const item of behaviors) {
      initial.set(item.item_id, { decision: 'pending', editedValues: {} });
    }
    setReviewStates(initial);
  };

  // Build modified action with only approved items + edits applied
  const buildApprovedAction = (): NovaAction | null => {
    if (!action) return null;

    const approvedBehaviors = behaviors
      .filter(b => reviewStates.get(b.item_id)?.decision === 'approved')
      .map(b => {
        const state = reviewStates.get(b.item_id)!;
        const edited = { ...b };

        // Apply measurement edits
        if (Object.keys(state.editedValues).length > 0) {
          edited.measurement = { ...edited.measurement, ...state.editedValues };
        }

        // Apply target remap
        if (state.remappedTargetId) {
          edited.target_match = {
            ...edited.target_match,
            target_id: state.remappedTargetId,
            target_name: state.remappedTargetName || edited.target_match.target_name,
            match_status: 'matched_existing_target',
            match_confidence: 1.0,
          };
          // Clear needs_review since user explicitly chose target
          edited.quality = { ...edited.quality, needs_review: false };
        }

        // Mark for new target creation
        if (state.createNewTarget && state.newTargetName) {
          edited.target_match = {
            ...edited.target_match,
            match_status: 'user_confirmed_new_target',
            target_name: state.newTargetName,
            target_type: state.newTargetType || edited.target_match.target_type,
            match_confidence: 1.0,
          };
          edited.quality = { ...edited.quality, needs_review: false };
        }

        return edited;
      });

    return {
      ...action,
      data: {
        ...action.data,
        behaviors: approvedBehaviors,
      },
    };
  };

  const handleSaveApproved = async () => {
    const modifiedAction = buildApprovedAction();
    if (!modifiedAction || !modifiedAction.data.behaviors.length) return;
    setIsSaving(true);
    try {
      const success = await onSaveApproved(modifiedAction, 'session_data');

      // Build save receipt
      const newTargetCount = modifiedAction.data.behaviors.filter(
        (b: ParsedItem) => b.target_match?.match_status === 'user_confirmed_new_target'
      ).length;
      const remappedCount = [...reviewStates.values()].filter(s => s.remappedTargetId).length;
      const editedCount = [...reviewStates.values()].filter(
        s => s.decision === 'approved' && Object.keys(s.editedValues).length > 0
      ).length;

      const parts: string[] = [];
      parts.push(`${approvedCount} item${approvedCount !== 1 ? 's' : ''} saved`);
      if (rejectedCount > 0) parts.push(`${rejectedCount} rejected`);
      if (newTargetCount > 0) parts.push(`${newTargetCount} new target${newTargetCount !== 1 ? 's' : ''} created`);
      if (remappedCount > 0) parts.push(`${remappedCount} remapped`);
      if (editedCount > 0) parts.push(`${editedCount} edited`);
      parts.push('graphs queued for refresh');

      if (success) {
        toast.success(`Review complete — ${parts.join(' · ')}`, { duration: 5000 });
      }

      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Counts
  const approvedCount = [...reviewStates.values()].filter(s => s.decision === 'approved').length;
  const rejectedCount = [...reviewStates.values()].filter(s => s.decision === 'rejected').length;
  const pendingCount = [...reviewStates.values()].filter(s => s.decision === 'pending').length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
          <SheetTitle className="text-base flex items-center gap-2">
            Review Parsed Items
            <Badge variant="secondary" className="text-[10px]">{behaviors.length} items</Badge>
          </SheetTitle>
          <SheetDescription className="text-xs">
            Approve, reject, or edit each item before saving to clinical data.
          </SheetDescription>

          {/* Summary + Bulk Actions */}
          <div className="flex items-center gap-2 pt-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] gap-1 border-emerald-300 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-2.5 h-2.5" /> {approvedCount}
            </Badge>
            <Badge variant="outline" className="text-[10px] gap-1 border-red-300 text-red-700 dark:text-red-400">
              <XCircle className="w-2.5 h-2.5" /> {rejectedCount}
            </Badge>
            <Badge variant="outline" className="text-[10px] gap-1 border-amber-300 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-2.5 h-2.5" /> {pendingCount}
            </Badge>
            <Separator orientation="vertical" className="h-4" />
            <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={approveAll}>
              <CheckCheck className="w-3 h-3" /> Approve All
            </Button>
            <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={rejectAll}>
              <XOctagon className="w-3 h-3" /> Reject All
            </Button>
            <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={resetAll}>
              <RotateCcw className="w-3 h-3" /> Reset
            </Button>
          </div>
        </SheetHeader>

        {/* Item Cards */}
        <ScrollArea className="flex-1 px-4 py-3">
          <div className="space-y-2.5">
            {behaviors.map((item) => {
              const state = reviewStates.get(item.item_id) || { decision: 'pending', editedValues: {} };
              const isExpanded = expandedItems.has(item.item_id);
              const matchBadge = MATCH_BADGES[item.target_match?.match_status] || { className: 'bg-muted', label: '?' };

              return (
                <Card
                  key={item.item_id}
                  className={`transition-colors border-l-4 ${
                    state.decision === 'approved'
                      ? 'border-l-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/10'
                      : state.decision === 'rejected'
                      ? 'border-l-red-400 bg-red-50/30 dark:bg-red-950/10 opacity-60'
                      : 'border-l-amber-400'
                  }`}
                >
                  <CardContent className="p-3 space-y-2">
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className="flex-1 cursor-pointer select-none"
                        onClick={() => toggleExpand(item.item_id)}
                      >
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-sm">
                            {item.target_match?.target_name || item.raw_text?.slice(0, 40)}
                          </span>
                          <Badge className={`text-[9px] px-1.5 py-0 ${matchBadge.className}`}>
                            {matchBadge.label}
                          </Badge>
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                            {MEASUREMENT_LABELS[item.measurement?.measurement_type] || item.measurement?.measurement_type}
                          </Badge>
                          {item.quality?.confidence != null && (
                            <span className="text-[10px] text-muted-foreground">
                              {Math.round(item.quality.confidence * 100)}%
                            </span>
                          )}
                          {isExpanded
                            ? <ChevronUp className="w-3 h-3 text-muted-foreground" />
                            : <ChevronDown className="w-3 h-3 text-muted-foreground" />
                          }
                        </div>
                        {/* Value summary */}
                        <div className="flex gap-2 text-[11px] text-muted-foreground mt-0.5">
                          {item.measurement?.frequency_count != null && <span>count: {state.editedValues.frequency_count ?? item.measurement.frequency_count}</span>}
                          {item.measurement?.trial_correct != null && (
                            <span>
                              {state.editedValues.trial_correct ?? item.measurement.trial_correct}/
                              {state.editedValues.trial_total ?? item.measurement.trial_total}
                            </span>
                          )}
                          {item.measurement?.duration_seconds != null && <span>{state.editedValues.duration_seconds ?? item.measurement.duration_seconds}s</span>}
                          {item.measurement?.latency_seconds != null && <span>lat: {state.editedValues.latency_seconds ?? item.measurement.latency_seconds}s</span>}
                          {item.prompting?.prompt_level && <span>prompt: {item.prompting.prompt_level}</span>}
                        </div>
                      </div>

                      {/* Decision Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant={state.decision === 'approved' ? 'default' : 'outline'}
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateState(item.item_id, {
                            decision: state.decision === 'approved' ? 'pending' : 'approved',
                          })}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant={state.decision === 'rejected' ? 'destructive' : 'outline'}
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateState(item.item_id, {
                            decision: state.decision === 'rejected' ? 'pending' : 'rejected',
                          })}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => toggleExpand(item.item_id)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Raw text */}
                    <p className="text-[11px] text-muted-foreground italic leading-snug">
                      "{item.raw_text}"
                    </p>

                    {/* Warnings */}
                    {item.quality?.warning_codes?.length ? (
                      <div className="flex flex-wrap gap-1">
                        {item.quality.warning_codes.map((code, i) => (
                          <Badge key={i} variant="outline" className="text-[9px] border-amber-300 text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="w-2 h-2 mr-0.5" /> {code}
                          </Badge>
                        ))}
                      </div>
                    ) : null}

                    {/* Expanded Edit Section */}
                    {isExpanded && (
                      <div className="pt-2 border-t border-border/50 space-y-3">
                        {/* Editable Values */}
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                            Measurement Values
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {item.measurement?.frequency_count != null && (
                              <div>
                                <label className="text-[10px] text-muted-foreground">Frequency</label>
                                <Input
                                  type="number"
                                  className="h-7 text-xs"
                                  value={state.editedValues.frequency_count ?? item.measurement.frequency_count}
                                  onChange={e => updateState(item.item_id, {
                                    editedValues: { ...state.editedValues, frequency_count: Number(e.target.value) },
                                  })}
                                />
                              </div>
                            )}
                            {item.measurement?.duration_seconds != null && (
                              <div>
                                <label className="text-[10px] text-muted-foreground">Duration (sec)</label>
                                <Input
                                  type="number"
                                  className="h-7 text-xs"
                                  value={state.editedValues.duration_seconds ?? item.measurement.duration_seconds}
                                  onChange={e => updateState(item.item_id, {
                                    editedValues: { ...state.editedValues, duration_seconds: Number(e.target.value) },
                                  })}
                                />
                              </div>
                            )}
                            {item.measurement?.latency_seconds != null && (
                              <div>
                                <label className="text-[10px] text-muted-foreground">Latency (sec)</label>
                                <Input
                                  type="number"
                                  className="h-7 text-xs"
                                  value={state.editedValues.latency_seconds ?? item.measurement.latency_seconds}
                                  onChange={e => updateState(item.item_id, {
                                    editedValues: { ...state.editedValues, latency_seconds: Number(e.target.value) },
                                  })}
                                />
                              </div>
                            )}
                            {item.measurement?.trial_correct != null && (
                              <>
                                <div>
                                  <label className="text-[10px] text-muted-foreground">Trials Correct</label>
                                  <Input
                                    type="number"
                                    className="h-7 text-xs"
                                    value={state.editedValues.trial_correct ?? item.measurement.trial_correct}
                                    onChange={e => updateState(item.item_id, {
                                      editedValues: { ...state.editedValues, trial_correct: Number(e.target.value) },
                                    })}
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-muted-foreground">Trials Total</label>
                                  <Input
                                    type="number"
                                    className="h-7 text-xs"
                                    value={state.editedValues.trial_total ?? item.measurement.trial_total}
                                    onChange={e => updateState(item.item_id, {
                                      editedValues: { ...state.editedValues, trial_total: Number(e.target.value) },
                                    })}
                                  />
                                </div>
                              </>
                            )}
                            {item.measurement?.interval_occurrence != null && (
                              <>
                                <div>
                                  <label className="text-[10px] text-muted-foreground">Intervals Occurred</label>
                                  <Input
                                    type="number"
                                    className="h-7 text-xs"
                                    value={state.editedValues.interval_occurrence ?? item.measurement.interval_occurrence}
                                    onChange={e => updateState(item.item_id, {
                                      editedValues: { ...state.editedValues, interval_occurrence: Number(e.target.value) },
                                    })}
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-muted-foreground">Intervals Total</label>
                                  <Input
                                    type="number"
                                    className="h-7 text-xs"
                                    value={state.editedValues.interval_total ?? item.measurement.interval_total}
                                    onChange={e => updateState(item.item_id, {
                                      editedValues: { ...state.editedValues, interval_total: Number(e.target.value) },
                                    })}
                                  />
                                </div>
                              </>
                            )}
                            {item.measurement?.rate_per_minute != null && (
                              <div>
                                <label className="text-[10px] text-muted-foreground">Rate/min</label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  className="h-7 text-xs"
                                  value={state.editedValues.rate_per_minute ?? item.measurement.rate_per_minute}
                                  onChange={e => updateState(item.item_id, {
                                    editedValues: { ...state.editedValues, rate_per_minute: Number(e.target.value) },
                                  })}
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Target Remap */}
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                            <Target className="w-3 h-3 inline mr-1" />
                            Target Assignment
                          </p>
                          <div className="space-y-2">
                            <SearchableTargetDropdown
                              targets={availableTargets}
                              selectedId={state.remappedTargetId || item.target_match?.target_id || ''}
                              onSelect={(id, name) => {
                                updateState(item.item_id, {
                                  remappedTargetId: id,
                                  remappedTargetName: name,
                                  createNewTarget: false,
                                  newTargetName: undefined,
                                });
                              }}
                            />

                            {/* Alternate matches from AI */}
                            {item.target_match?.alternate_matches?.length ? (
                              <div className="text-[10px] text-muted-foreground">
                                <span className="font-medium">AI alternates: </span>
                                {item.target_match.alternate_matches.map((alt, i) => (
                                  <Button
                                    key={i}
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 text-[10px] px-1.5 py-0 mx-0.5"
                                    onClick={() => updateState(item.item_id, {
                                      remappedTargetId: alt.target_id,
                                      remappedTargetName: alt.target_name,
                                      createNewTarget: false,
                                    })}
                                  >
                                    {alt.target_name} ({Math.round(alt.confidence * 100)}%)
                                  </Button>
                                ))}
                              </div>
                            ) : null}

                            {/* Create New Target */}
                            <div className="flex items-center gap-2">
                              <Button
                                variant={state.createNewTarget ? 'default' : 'outline'}
                                size="sm"
                                className="h-6 text-[10px] gap-1"
                                onClick={() => updateState(item.item_id, {
                                  createNewTarget: !state.createNewTarget,
                                  remappedTargetId: undefined,
                                  remappedTargetName: undefined,
                                  newTargetName: state.newTargetName || item.target_match?.target_name || '',
                                  newTargetType: state.newTargetType || item.target_match?.target_type || 'behavior',
                                })}
                              >
                                <Plus className="w-2.5 h-2.5" />
                                Create New Target
                              </Button>
                            </div>

                            {state.createNewTarget && (
                              <div className="grid grid-cols-2 gap-2 pl-2 border-l-2 border-primary/20">
                                <div>
                                  <label className="text-[10px] text-muted-foreground">Target Name</label>
                                  <Input
                                    className="h-7 text-xs"
                                    value={state.newTargetName || ''}
                                    onChange={e => updateState(item.item_id, { newTargetName: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-muted-foreground">Type</label>
                                  <Select
                                    value={state.newTargetType || 'behavior'}
                                    onValueChange={val => updateState(item.item_id, { newTargetType: val })}
                                  >
                                    <SelectTrigger className="h-7 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="behavior" className="text-xs">Behavior</SelectItem>
                                      <SelectItem value="skill" className="text-xs">Skill</SelectItem>
                                      <SelectItem value="replacement_behavior" className="text-xs">Replacement</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* ABC Context (read-only display) */}
                        {item.context?.antecedent && (
                          <div className="text-[11px] space-y-0.5">
                            <p><span className="font-medium">A:</span> {item.context.antecedent}</p>
                            {item.context.behavior_description && <p><span className="font-medium">B:</span> {item.context.behavior_description}</p>}
                            {item.context.consequence && <p><span className="font-medium">C:</span> {item.context.consequence}</p>}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>

        {/* Footer */}
        <SheetFooter className="px-5 py-3 border-t border-border gap-2 sm:justify-between">
          <div className="text-[11px] text-muted-foreground">
            {approvedCount > 0 && <span className="text-emerald-600 dark:text-emerald-400 font-medium">{approvedCount} approved</span>}
            {rejectedCount > 0 && <span className="ml-2 text-red-500">{rejectedCount} rejected</span>}
            {pendingCount > 0 && <span className="ml-2">{pendingCount} pending</span>}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              disabled={approvedCount === 0 || isSaving}
              onClick={handleSaveApproved}
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? 'Saving...' : `Save ${approvedCount} Approved`}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
