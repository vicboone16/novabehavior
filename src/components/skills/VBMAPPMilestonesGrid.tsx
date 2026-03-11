import { useState, useEffect, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { Plus, ChevronDown, Loader2, Info, Calendar, BarChart2, BookOpen, Trash2, Printer, Save, X, AlertTriangle, LayoutGrid, List } from 'lucide-react';
import { VBMAPPCoordinateGrid, type AssessmentOverlay } from './VBMAPPCoordinateGrid';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

type FillState = 'EMPTY' | 'HALF' | 'FULL';

interface MilestoneItem {
  item_id: string;
  domain: string;
  level: 1 | 2 | 3;
  code: string;
  label_short: string;
  label_full: string | null;
  sort_order: number;
}

interface Assessment {
  assessment_id: string;
  learner_id: string;
  assessment_date: string;
  examiner: string | null;
  notes_global: string | null;
}

interface ItemResult {
  result_id?: string;
  assessment_id: string;
  item_id: string;
  fill_state: FillState;
  tested_circle: boolean;
  notes_item: string | null;
  updated_in_assessment_id: string | null;
}

type ResultsMap = Record<string, ItemResult>; // keyed by item_id

// ─── Domain + Level layout config ────────────────────────────────────────────

const DOMAIN_ORDER = [
  'Mand', 'Tact', 'Listener Responding', 'Visual Perceptual/MTS',
  'Independent Play', 'Social Behavior', 'Motor Imitation', 'Echoic',
  'Reading', 'Writing', 'LRFFC', 'Intraverbal',
  'Group & Social', 'Linguistic Structure', 'Math',
];

const LEVEL_LABELS: Record<number, string> = { 1: 'Level 1', 2: 'Level 2', 3: 'Level 3' };

// ─── Cell Component ───────────────────────────────────────────────────────────

interface MilestoneItemCellProps {
  item: MilestoneItem;
  result: ItemResult | undefined;
  isCurrentAssessment: boolean;
  selectedAssessmentId: string;
  onUpdate: (itemId: string, updates: Partial<Pick<ItemResult, 'fill_state' | 'tested_circle'>>) => void;
  onOpenDetail: (item: MilestoneItem, result: ItemResult | undefined) => void;
}

function MilestoneCellFillBox({ fill }: { fill: FillState }) {
  return (
    <div
      className="relative w-full border border-border rounded-sm overflow-hidden"
      style={{ height: 28 }}
    >
      {/* Background empty */}
      <div className="absolute inset-0 bg-background" />
      {/* Half fill - bottom 50% */}
      {fill === 'HALF' && (
        <div className="absolute left-0 right-0 bottom-0 bg-foreground" style={{ height: '50%' }} />
      )}
      {/* Full fill */}
      {fill === 'FULL' && (
        <div className="absolute inset-0 bg-foreground" />
      )}
    </div>
  );
}

function MilestoneItemCell({
  item,
  result,
  isCurrentAssessment,
  selectedAssessmentId,
  onUpdate,
  onOpenDetail,
}: MilestoneItemCellProps) {
  const fill = result?.fill_state ?? 'EMPTY';
  const circle = result?.tested_circle ?? false;
  const updatedInCurrent = result?.updated_in_assessment_id === selectedAssessmentId;

  const handleBoxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Cycle: EMPTY → HALF → FULL → EMPTY
    const next: FillState = fill === 'EMPTY' ? 'HALF' : fill === 'HALF' ? 'FULL' : 'EMPTY';
    const updates: Partial<Pick<ItemResult, 'fill_state' | 'tested_circle'>> = { fill_state: next };
    // If filling, clear circle
    if (next === 'HALF' || next === 'FULL') {
      updates.tested_circle = false;
    }
    onUpdate(item.item_id, updates);
  };

  const handleCircleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newCircle = !circle;
    const updates: Partial<Pick<ItemResult, 'fill_state' | 'tested_circle'>> = {
      tested_circle: newCircle,
    };
    // If turning circle ON, force empty box
    if (newCircle) {
      updates.fill_state = 'EMPTY';
    }
    onUpdate(item.item_id, updates);
  };

  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="flex flex-col items-center gap-0.5 cursor-pointer select-none group"
            style={{ width: 44 }}
          >
            {/* Item code label */}
            <span className="text-[8px] text-muted-foreground font-mono leading-tight truncate w-full text-center">
              {item.label_short}
            </span>

            {/* Main fill box — date overlay if updated in current assessment */}
            <div
              className="relative w-full"
              onClick={handleBoxClick}
              style={{ outline: updatedInCurrent ? '2px solid hsl(var(--primary))' : undefined, borderRadius: 3 }}
            >
              <MilestoneCellFillBox fill={fill} />
              {/* Date overlay corner triangle */}
              {updatedInCurrent && (
                <div
                  className="absolute top-0 right-0"
                  style={{
                    width: 0, height: 0,
                    borderStyle: 'solid',
                    borderWidth: '0 8px 8px 0',
                    borderColor: 'transparent hsl(var(--primary)) transparent transparent',
                  }}
                />
              )}
            </div>

            {/* Tested circle */}
            <div
              className="flex items-center justify-center"
              onClick={handleCircleClick}
              style={{ width: 12, height: 12 }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  border: '1.5px solid hsl(var(--foreground))',
                  backgroundColor: circle ? 'hsl(var(--foreground))' : 'transparent',
                  transition: 'background-color 0.1s',
                }}
              />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm z-50">
          <div className="space-y-1.5 text-xs">
            <div className="font-bold text-sm">{item.code} — {item.label_short}</div>
            {item.label_full && (
              <div className="bg-muted/60 rounded p-1.5 text-foreground text-xs leading-snug">
                <span className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Criteria / Prompt: </span>
                {item.label_full}
              </div>
            )}
            <div className="border-t pt-1 space-y-0.5 text-muted-foreground">
              <div><span className="font-medium">Domain:</span> {item.domain} · Level {item.level}</div>
              <div><span className="font-medium">Box status:</span> {fill === 'FULL' ? 'Mastered ●' : fill === 'HALF' ? 'Emerging ◑' : 'Empty'} <span className="opacity-60">(click to cycle)</span></div>
              <div><span className="font-medium">Circle:</span> {circle ? 'Tested – not met ○' : 'Off'} <span className="opacity-60">(click to toggle)</span></div>
              {updatedInCurrent && <div className="text-primary font-medium">Updated in current session</div>}
            </div>
            <button
              className="text-primary underline text-xs mt-0.5"
              onClick={(e) => { e.stopPropagation(); onOpenDetail(item, result); }}
            >
              Add notes / details →
            </button>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── Domain Row ───────────────────────────────────────────────────────────────

interface DomainSectionProps {
  domain: string;
  items: MilestoneItem[];
  results: ResultsMap;
  selectedAssessmentId: string;
  onUpdate: (itemId: string, updates: Partial<Pick<ItemResult, 'fill_state' | 'tested_circle'>>) => void;
  onOpenDetail: (item: MilestoneItem, result: ItemResult | undefined) => void;
}

function DomainSection({
  domain, items, results, selectedAssessmentId, onUpdate, onOpenDetail,
}: DomainSectionProps) {
  const [collapsed, setCollapsed] = useState(false);

  const byLevel = useMemo(() => {
    const map: Record<number, MilestoneItem[]> = { 1: [], 2: [], 3: [] };
    items.forEach(i => map[i.level].push(i));
    Object.values(map).forEach(arr => arr.sort((a, b) => a.sort_order - b.sort_order));
    return map;
  }, [items]);

  // Counts per domain
  const { metCount, testedNotMetCount, notTestedCount } = useMemo(() => {
    let met = 0, tnotmet = 0, nottested = 0;
    items.forEach(i => {
      const r = results[i.item_id];
      if (!r || r.fill_state === 'EMPTY') {
        if (r?.tested_circle) tnotmet++;
        else nottested++;
      } else {
        met++;
      }
    });
    return { metCount: met, testedNotMetCount: tnotmet, notTestedCount: nottested };
  }, [items, results]);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Domain header */}
      <button
        className="w-full flex items-center justify-between px-4 py-2 bg-muted/60 hover:bg-muted transition-colors text-left"
        onClick={() => setCollapsed(v => !v)}
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm">{domain}</span>
          <div className="flex gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 bg-foreground rounded-sm" />
              {metCount} met
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full border border-foreground" />
              {testedNotMetCount} not met
            </span>
            <span>·</span>
            <span className="text-muted-foreground">{notTestedCount} untested</span>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${collapsed ? '-rotate-90' : ''}`} />
      </button>

      {!collapsed && (
        <div className="p-4 space-y-4 overflow-x-auto">
          {([3, 2, 1] as const).map(level => {
            const levelItems = byLevel[level];
            if (!levelItems.length) return null;

            return (
              <div key={level}>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: level === 3 ? 'hsl(var(--primary) / 0.15)' : level === 2 ? 'hsl(var(--secondary))' : 'hsl(var(--muted))',
                      color: level === 3 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                    }}
                  >
                    {LEVEL_LABELS[level]}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Items in a horizontal row */}
                <div className="flex gap-2 flex-wrap">
                  {levelItems.map(item => (
                    <MilestoneItemCell
                      key={item.item_id}
                      item={item}
                      result={results[item.item_id]}
                      isCurrentAssessment={true}
                      selectedAssessmentId={selectedAssessmentId}
                      onUpdate={onUpdate}
                      onOpenDetail={onOpenDetail}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Item Detail Modal ────────────────────────────────────────────────────────

interface ItemDetailModalProps {
  item: MilestoneItem | null;
  result: ItemResult | undefined;
  onClose: () => void;
  onSaveNotes: (itemId: string, notes: string) => void;
}

function ItemDetailModal({ item, result, onClose, onSaveNotes }: ItemDetailModalProps) {
  const [notes, setNotes] = useState(result?.notes_item ?? '');

  useEffect(() => {
    setNotes(result?.notes_item ?? '');
  }, [result]);

  if (!item) return null;

  const meaning =
    result?.fill_state === 'HALF' ? 'Tested – Emerging (½ criteria met)'
    : result?.fill_state === 'FULL' ? 'Tested – Mastered (criteria met)'
    : result?.tested_circle ? 'Tested – Not Met (circle marked)'
    : 'Not Yet Tested';

  return (
    <Dialog open={!!item} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">{item.code} — {item.label_short}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {item.label_full && (
            <p className="text-sm text-muted-foreground">{item.label_full}</p>
          )}
          <div className="flex items-center gap-2">
            <Badge variant="outline">{item.domain}</Badge>
            <Badge variant="outline">Level {item.level}</Badge>
          </div>
          <div className="text-sm">
            <span className="font-medium">Current status: </span>
            <span className="text-muted-foreground">{meaning}</span>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Notes / Evidence</label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add clinical notes, evidence, or observations..."
              rows={3}
              className="text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={() => { onSaveNotes(item.item_id, notes); onClose(); }}>
              Save Notes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface VBMAPPMilestonesGridProps {
  studentId: string;
  studentName: string;
}

export function VBMAPPMilestonesGrid({ studentId, studentName }: VBMAPPMilestonesGridProps) {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingAssessment, setCreatingAssessment] = useState(false);

  // Template items
  const [templateItems, setTemplateItems] = useState<MilestoneItem[]>([]);

  // Assessments for this learner
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);

  // Results overlaid on template
  const [results, setResults] = useState<ResultsMap>({});

  // Item detail modal
  const [detailItem, setDetailItem] = useState<MilestoneItem | null>(null);
  const [detailResult, setDetailResult] = useState<ItemResult | undefined>(undefined);

  // Pending saves (debounced upsert queue)
  const [pendingSaves, setPendingSaves] = useState<Set<string>>(new Set());

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [assessmentToDelete, setAssessmentToDelete] = useState<Assessment | null>(null);
  const [deleting, setDeleting] = useState(false);

  // View toggle: list (domain sections) vs grid (coordinate master grid)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Historical overlay results for non-selected assessments
  const [overlayResults, setOverlayResults] = useState<Record<string, Record<string, ItemResult>>>({});


  // ── Load template items (static, load once) ────────────────────────────────
  useEffect(() => {
    supabase
      .from('vb_mapp_milestones_items')
      .select('*')
      .order('domain')
      .order('level')
      .order('sort_order')
      .then(({ data, error }) => {
        if (error) console.error('Error loading template:', error);
        else setTemplateItems((data ?? []) as MilestoneItem[]);
      });
  }, []);

  // ── Load assessments for this student ─────────────────────────────────────
  useEffect(() => {
    loadAssessments();
  }, [studentId]);

  const loadAssessments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('vb_mapp_assessments')
      .select('*')
      .eq('learner_id', studentId)
      .order('assessment_date', { ascending: false });

    if (error) {
      console.error('Error loading assessments:', error);
      toast.error('Failed to load assessments');
    } else {
      const list = (data ?? []) as Assessment[];
      setAssessments(list);
      if (list.length > 0 && !selectedAssessmentId) {
        setSelectedAssessmentId(list[0].assessment_id);
      }
    }
    setLoading(false);
  };

  // ── Load results when selected assessment changes ─────────────────────────
  useEffect(() => {
    if (!selectedAssessmentId) { setResults({}); return; }

    supabase
      .from('vb_mapp_assessment_results')
      .select('*')
      .eq('assessment_id', selectedAssessmentId)
      .then(({ data, error }) => {
        if (error) console.error('Error loading results:', error);
        else {
          const map: ResultsMap = {};
          (data ?? []).forEach((r: any) => { map[r.item_id] = r as ItemResult; });
          setResults(map);
        }
      });
  }, [selectedAssessmentId]);

  // ── Load overlay results for historical assessments ───────────────────────
  useEffect(() => {
    if (!selectedAssessmentId || assessments.length <= 1) {
      setOverlayResults({});
      return;
    }
    const otherIds = assessments
      .filter(a => a.assessment_id !== selectedAssessmentId)
      .slice(0, 3) // max 3 historical overlays
      .map(a => a.assessment_id);

    if (otherIds.length === 0) { setOverlayResults({}); return; }

    Promise.all(
      otherIds.map(id =>
        supabase
          .from('vb_mapp_assessment_results')
          .select('*')
          .eq('assessment_id', id)
          .then(({ data }) => {
            const map: Record<string, ItemResult> = {};
            (data ?? []).forEach((r: any) => { map[r.item_id] = r as ItemResult; });
            return { id, map };
          })
      )
    ).then(results => {
      const combined: Record<string, Record<string, ItemResult>> = {};
      results.forEach(({ id, map }) => { combined[id] = map; });
      setOverlayResults(combined);
    });
  }, [selectedAssessmentId, assessments]);

  // ── Build overlay objects for coordinate grid ─────────────────────────────
  const OVERLAY_COLORS = ['#a855f7', '#f97316', '#14b8a6'];
  const gridOverlays: AssessmentOverlay[] = useMemo(() => {
    if (!selectedAssessmentId) return [];
    const otherAssessments = assessments
      .filter(a => a.assessment_id !== selectedAssessmentId)
      .slice(0, 3);
    return otherAssessments
      .map((a, i) => ({
        assessmentId: a.assessment_id,
        assessmentDate: a.assessment_date,
        color: OVERLAY_COLORS[i] || '#888',
        label: `${i + 2}${i === 0 ? 'nd' : i === 1 ? 'rd' : 'th'}`,
        results: overlayResults[a.assessment_id] || {},
      }));
  }, [assessments, selectedAssessmentId, overlayResults]);


  const handleCreateAssessment = async () => {
    setCreatingAssessment(true);
    const { data, error } = await supabase
      .from('vb_mapp_assessments')
      .insert({
        learner_id: studentId,
        assessment_date: format(new Date(), 'yyyy-MM-dd'),
        created_by: user?.id,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create assessment');
    } else {
      const newA = data as Assessment;
      setAssessments(prev => [newA, ...prev]);
      setSelectedAssessmentId(newA.assessment_id);
      setResults({});
      toast.success('New assessment started');
    }
    setCreatingAssessment(false);
  };

  // ── Update a cell (optimistic + queue save) ───────────────────────────────
  const handleCellUpdate = useCallback(
    (itemId: string, updates: Partial<Pick<ItemResult, 'fill_state' | 'tested_circle'>>) => {
      if (!selectedAssessmentId) return;

      setResults(prev => {
        const existing = prev[itemId];
        const next: ItemResult = {
          result_id: existing?.result_id,
          assessment_id: selectedAssessmentId,
          item_id: itemId,
          fill_state: existing?.fill_state ?? 'EMPTY',
          tested_circle: existing?.tested_circle ?? false,
          notes_item: existing?.notes_item ?? null,
          updated_in_assessment_id: selectedAssessmentId,
          ...updates,
        };
        return { ...prev, [itemId]: next };
      });

      setPendingSaves(prev => new Set(prev).add(itemId));
    },
    [selectedAssessmentId]
  );

  // ── Handle grid cell click (cycle EMPTY → HALF → FULL → EMPTY) ───────────
  const handleGridCellClick = useCallback(
    (itemId: string, currentFill: 'EMPTY' | 'HALF' | 'FULL') => {
      const nextFill: FillState =
        currentFill === 'EMPTY' ? 'HALF' :
        currentFill === 'HALF' ? 'FULL' : 'EMPTY';
      handleCellUpdate(itemId, { fill_state: nextFill, tested_circle: false });
    },
    [handleCellUpdate]
  );

  // ── Flush pending saves ───────────────────────────────────────────────────
  useEffect(() => {
    if (pendingSaves.size === 0) return;

    const timer = setTimeout(async () => {
      const itemIds = Array.from(pendingSaves);
      setPendingSaves(new Set());

      const rows = itemIds
        .map(id => results[id])
        .filter(Boolean)
        .map(r => ({
          assessment_id: r.assessment_id,
          item_id: r.item_id,
          fill_state: r.fill_state,
          tested_circle: r.tested_circle,
          notes_item: r.notes_item,
          updated_in_assessment_id: r.updated_in_assessment_id,
          updated_at: new Date().toISOString(),
        }));

      if (!rows.length) return;

      setSaving(true);
      const { error } = await supabase
        .from('vb_mapp_assessment_results')
        .upsert(rows, { onConflict: 'assessment_id,item_id' });

      if (error) {
        console.error('Error saving results:', error);
        toast.error('Failed to save scores');
      }

      // Re-fetch to get result_ids
      const { data } = await supabase
        .from('vb_mapp_assessment_results')
        .select('*')
        .eq('assessment_id', rows[0].assessment_id)
        .in('item_id', itemIds);

      if (data) {
        setResults(prev => {
          const next = { ...prev };
          (data as ItemResult[]).forEach(r => { next[r.item_id] = r; });
          return next;
        });
      }
      setSaving(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [pendingSaves, results]);

  // ── Save item notes ───────────────────────────────────────────────────────
  const handleSaveNotes = (itemId: string, notes: string) => {
    if (!selectedAssessmentId) return;
    setResults(prev => {
      const existing = prev[itemId];
      return {
        ...prev,
        [itemId]: {
          result_id: existing?.result_id,
          assessment_id: selectedAssessmentId,
          item_id: itemId,
          fill_state: existing?.fill_state ?? 'EMPTY',
          tested_circle: existing?.tested_circle ?? false,
          notes_item: notes,
          updated_in_assessment_id: selectedAssessmentId,
        },
      };
    });
    setPendingSaves(prev => new Set(prev).add(itemId));
  };

  // ── Delete assessment ─────────────────────────────────────────────────────
  const handleDeleteAssessment = async () => {
    if (!assessmentToDelete) return;
    setDeleting(true);
    try {
      // Delete all results first
      await supabase
        .from('vb_mapp_assessment_results')
        .delete()
        .eq('assessment_id', assessmentToDelete.assessment_id);

      const { error } = await supabase
        .from('vb_mapp_assessments')
        .delete()
        .eq('assessment_id', assessmentToDelete.assessment_id);

      if (error) throw error;

      setAssessments(prev => prev.filter(a => a.assessment_id !== assessmentToDelete.assessment_id));
      if (selectedAssessmentId === assessmentToDelete.assessment_id) {
        setSelectedAssessmentId(null);
        setResults({});
      }
      toast.success('Assessment deleted');
    } catch (err) {
      console.error('Error deleting assessment:', err);
      toast.error('Failed to delete assessment');
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setAssessmentToDelete(null);
    }
  };

  // ── PDF Export ─────────────────────────────────────────────────────────────
  const handleExportPdf = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: html2canvas } = await import('html2canvas');
    const { toast } = await import('sonner');

    const selectedA = assessments.find(a => a.assessment_id === selectedAssessmentId);
    const dateStr = selectedA ? format(new Date(selectedA.assessment_date), 'MMMM d, yyyy') : '';

    // Build an off-screen container with the grid HTML
    const container = document.createElement('div');
    container.style.cssText = 'position:absolute;left:-9999px;top:0;width:1100px;background:#fff;padding:24px;font-family:Arial,sans-serif;font-size:13px;color:#222';

    const domainRows = domainGroups.map(({ domain, items }) => {
      const cells = items.map(item => {
        const r = results[item.item_id];
        const fill = r?.fill_state ?? 'EMPTY';
        const circle = r?.tested_circle ?? false;
        const fillLabel = fill === 'FULL' ? '●' : fill === 'HALF' ? '◑' : circle ? '○' : '—';
        const status = fill === 'FULL' ? 'Mastered' : fill === 'HALF' ? 'Emerging' : circle ? 'Not Met' : '';
        return `<tr>
          <td style="padding:4px 8px;border-bottom:1px solid #eee;font-weight:500">${item.code}</td>
          <td style="padding:4px 8px;border-bottom:1px solid #eee">${item.label_short}</td>
          <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:center;font-size:18px">${fillLabel}</td>
          <td style="padding:4px 8px;border-bottom:1px solid #eee;color:#666;font-size:12px">${status}</td>
          <td style="padding:4px 8px;border-bottom:1px solid #eee;color:#555;font-size:11px">${item.label_full || ''}</td>
          <td style="padding:4px 8px;border-bottom:1px solid #eee;color:#666;font-size:11px">${r?.notes_item || ''}</td>
        </tr>`;
      }).join('');
      return `<tr style="background:#f0f4f8"><td colspan="6" style="padding:6px 8px;font-weight:700;font-size:13px">${domain}</td></tr>${cells}`;
    }).join('');

    container.innerHTML = `
      <h1 style="font-size:18px;margin-bottom:4px">VB-MAPP Milestones Grid</h1>
      <p style="color:#555;margin:0 0 12px">Student: <strong>${studentName}</strong> &nbsp;|&nbsp; Assessment date: <strong>${dateStr}</strong></p>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr><th style="background:#e8edf2;padding:6px 8px;text-align:left;font-size:12px">Code</th><th style="background:#e8edf2;padding:6px 8px;text-align:left;font-size:12px">Milestone</th><th style="background:#e8edf2;padding:6px 8px;text-align:center;font-size:12px">Score</th><th style="background:#e8edf2;padding:6px 8px;text-align:left;font-size:12px">Status</th><th style="background:#e8edf2;padding:6px 8px;text-align:left;font-size:12px">Criteria / Prompt</th><th style="background:#e8edf2;padding:6px 8px;text-align:left;font-size:12px">Notes</th></tr></thead>
        <tbody>${domainRows}</tbody>
      </table>`;

    document.body.appendChild(container);

    try {
      toast.info('Generating PDF…');
      const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      document.body.removeChild(container);

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF('p', 'mm', 'a4');
      let position = 0;

      // Multi-page support
      while (position < imgHeight) {
        if (position > 0) pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, -position, imgWidth, imgHeight);
        position += pageHeight;
      }

      const safeName = studentName?.replace(/\s+/g, '-') || 'student';
      pdf.save(`vbmapp-milestones-${safeName}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('PDF downloaded');
    } catch (err) {
      document.body.removeChild(container);
      console.error('PDF export error:', err);
      toast.error('Failed to generate PDF');
    }
  };

  // ── Group template items by domain ───────────────────────────────────────
  const domainGroups = useMemo(() => {
    const map = new Map<string, MilestoneItem[]>();
    templateItems.forEach(item => {
      if (!map.has(item.domain)) map.set(item.domain, []);
      map.get(item.domain)!.push(item);
    });
    // Sort by DOMAIN_ORDER
    const result: Array<{ domain: string; items: MilestoneItem[] }> = [];
    DOMAIN_ORDER.forEach(d => {
      if (map.has(d)) result.push({ domain: d, items: map.get(d)! });
    });
    // Add any unknown domains
    map.forEach((items, domain) => {
      if (!DOMAIN_ORDER.includes(domain)) result.push({ domain, items });
    });
    return result;
  }, [templateItems]);

  // ── Global score summary ──────────────────────────────────────────────────
  const summary = useMemo(() => {
    let met = 0, notMet = 0, untested = 0;
    templateItems.forEach(i => {
      const r = results[i.item_id];
      if (!r || r.fill_state === 'EMPTY') {
        if (r?.tested_circle) notMet++;
        else untested++;
      } else met++;
    });
    return { met, notMet, untested, total: templateItems.length };
  }, [templateItems, results]);

  const selectedAssessment = assessments.find(a => a.assessment_id === selectedAssessmentId);

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Delete confirmation ── */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              Delete VB-MAPP Assessment
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the assessment from{' '}
              <strong>
                {assessmentToDelete?.assessment_date
                  ? format(new Date(assessmentToDelete.assessment_date), 'MMM d, yyyy')
                  : ''}
              </strong>{' '}
              and all scored milestones. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAssessment}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete Assessment'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Internal Tracker Banner (matching AFLS / ABLLS-R) ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">VB-MAPP Milestones</h3>
          <Badge variant="outline" className="text-xs">Internal Tracker</Badge>
        </div>
        <div className="flex items-center gap-2">
          {selectedAssessmentId && (
            <>
              {saving && <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Saving…</span>}
              <Button
                size="sm"
                variant="outline"
                onClick={handlePrint}
                title="Export / Print milestones grid"
              >
                <Printer className="w-3.5 h-3.5 mr-1" />
                Export Grid
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground"
                onClick={() => { setSelectedAssessmentId(null); setResults({}); }}
                title="Close / cancel current assessment view"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Close
              </Button>
              {selectedAssessment && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => { setAssessmentToDelete(selectedAssessment); setDeleteConfirmOpen(true); }}
                  title="Delete this assessment"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Delete
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Info card ── */}
      <Card className="bg-accent/50 border-accent">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <BookOpen className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">VB-MAPP Milestones is entered directly by clinicians</p>
              <p className="text-xs text-muted-foreground mt-1">
                170 items across 15 domains (Levels 1–3). Click any square to cycle EMPTY → HALF → FULL.
                The circle below each square marks "tested – not met." Hover over a square to see the full criteria prompt.
                Changes auto-save. <strong className="text-foreground">These assessments are NOT sent out as questionnaires.</strong>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Assessment selector bar ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
          {assessments.length === 0 ? (
            <span className="text-sm text-muted-foreground">No assessments yet</span>
          ) : (
            <Select
              value={selectedAssessmentId ?? ''}
              onValueChange={setSelectedAssessmentId}
            >
              <SelectTrigger className="h-8 text-sm max-w-xs">
                <SelectValue placeholder="Select assessment date" />
              </SelectTrigger>
              <SelectContent>
                {assessments.map(a => (
                  <SelectItem key={a.assessment_id} value={a.assessment_id}>
                    {format(new Date(a.assessment_date), 'MMM d, yyyy')}
                    {a.examiner ? ` — ${a.examiner}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          {selectedAssessmentId && (
            <div className="flex border border-border rounded-lg overflow-hidden">
              <Button
                size="sm"
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                className="rounded-none h-8 px-3 text-xs"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="w-3.5 h-3.5 mr-1" />
                Grid
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                className="rounded-none h-8 px-3 text-xs"
                onClick={() => setViewMode('list')}
              >
                <List className="w-3.5 h-3.5 mr-1" />
                List
              </Button>
            </div>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleCreateAssessment}
            disabled={creatingAssessment}
          >
            <Plus className="w-3 h-3 mr-1" />
            {creatingAssessment ? 'Creating…' : 'New Assessment'}
          </Button>
        </div>
      </div>

      {/* ── Summary bar ── */}
      {selectedAssessmentId && (
        <div className="flex items-center gap-4 px-3 py-2 rounded-lg bg-muted/50 text-xs text-muted-foreground flex-wrap">
          <div className="flex items-center gap-1.5">
            <BarChart2 className="w-3.5 h-3.5" />
            <span>{summary.total} items</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 bg-foreground rounded-sm" />
            <span><strong className="text-foreground">{summary.met}</strong> met</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full border border-foreground" />
            <span><strong className="text-foreground">{summary.notMet}</strong> tested-not-met</span>
          </div>
          <div className="text-muted-foreground">
            <strong className="text-foreground">{summary.untested}</strong> not yet tested
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <span
              className="inline-block w-3 h-3 rounded-sm border-2"
              style={{ borderColor: 'hsl(var(--primary))' }}
            />
            <span>= updated this session</span>
          </div>
        </div>
      )}

      {/* ── Legend ── */}
      <div className="flex items-center gap-5 px-3 py-2 bg-background border border-border rounded-lg text-xs text-muted-foreground flex-wrap">
        <span className="font-semibold text-foreground">Fill:</span>
        {[
          { label: 'Empty', fill: 'EMPTY' as FillState },
          { label: 'Emerging (½)', fill: 'HALF' as FillState },
          { label: 'Mastered (full)', fill: 'FULL' as FillState },
        ].map(({ label, fill }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="relative border border-border rounded-sm overflow-hidden" style={{ width: 16, height: 16 }}>
              {fill === 'HALF' && <div className="absolute left-0 right-0 bottom-0 bg-foreground" style={{ height: '50%' }} />}
              {fill === 'FULL' && <div className="absolute inset-0 bg-foreground" />}
            </div>
            <span>{label}</span>
          </div>
        ))}
        <span className="font-semibold text-foreground ml-3">Circle:</span>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full border border-foreground bg-foreground" />
          <span>Tested – not met</span>
        </div>
      </div>

      {/* ── No assessment selected ── */}
      {!selectedAssessmentId ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-3">Create a new assessment to begin scoring</p>
            <Button onClick={handleCreateAssessment} disabled={creatingAssessment}>
              <Plus className="w-4 h-4 mr-2" />
              Start First Assessment
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        /* ── Coordinate Grid View ── */
        <VBMAPPCoordinateGrid
          items={templateItems}
          currentAssessmentId={selectedAssessmentId}
          currentResults={results}
          overlays={gridOverlays}
          onCellClick={handleGridCellClick}
        />
      ) : (
        /* ── Domain List View ── */
        <div className="space-y-3">
          {domainGroups.map(({ domain, items }) => (
            <DomainSection
              key={domain}
              domain={domain}
              items={items}
              results={results}
              selectedAssessmentId={selectedAssessmentId}
              onUpdate={handleCellUpdate}
              onOpenDetail={(item, result) => {
                setDetailItem(item);
                setDetailResult(result);
              }}
            />
          ))}
        </div>
      )}

      {/* ── Item detail modal ── */}
      <ItemDetailModal
        item={detailItem}
        result={detailResult}
        onClose={() => { setDetailItem(null); setDetailResult(undefined); }}
        onSaveNotes={handleSaveNotes}
      />
    </div>
  );
}
