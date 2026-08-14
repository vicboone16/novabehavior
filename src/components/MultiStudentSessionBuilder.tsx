import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useDataStore } from '@/store/dataStore';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { enqueueDraft, dequeue, drainQueue, subscribeQueue, syncDraft } from '@/lib/multiStudentDraftQueue';
import type { DataCollectionMethod } from '@/types/behavior';
import {
  Users, Settings2, ChevronDown, ChevronRight, Save, Layers,
  FileDown, RotateCcw, FileText, AlertTriangle, Copy, Check, Trash2, Cloud,
  CloudOff, Loader2,
} from 'lucide-react';
import jsPDF from 'jspdf';

const METHODS: { value: DataCollectionMethod; label: string }[] = [
  { value: 'frequency', label: 'Frequency' },
  { value: 'duration', label: 'Duration' },
  { value: 'interval', label: 'Interval' },
  { value: 'abc', label: 'ABC' },
  { value: 'latency', label: 'Latency' },
];

type IntervalType = 'whole' | 'partial' | 'momentary';
type FrequencyMode = 'occurrence' | 'bouts';
type DurationMode = 'cumulative' | 'per_episode';

interface BehaviorConfig {
  methods: DataCollectionMethod[];
  interval: { type: IntervalType; samplingSec: number; intervalSec: number; totalMin: number; sync: boolean };
  frequency: { mode: FrequencyMode; minIrtSec: number };
  duration: { mode: DurationMode; autoStopSec: number };
}

interface ConfigTemplate {
  id: string;
  name: string;
  config: BehaviorConfig;
  createdAt: number;
}

interface SavedDraft {
  at: number;
  sessionId: string;
  chosenStudents: string[];
  chosenBehaviors: Record<string, string[]>;
  configs: Record<string, BehaviorConfig>;
}

const STORAGE_DRAFT = 'multiStudentSessionConfig';
const STORAGE_TEMPLATES = 'multiStudentSessionTemplates';

const defaultConfig = (): BehaviorConfig => ({
  methods: ['frequency'],
  interval: { type: 'momentary', samplingSec: 30, intervalSec: 30, totalMin: 15, sync: true },
  frequency: { mode: 'occurrence', minIrtSec: 0 },
  duration: { mode: 'cumulative', autoStopSec: 0 },
});

const key = (sid: string, bid: string) => `${sid}::${bid}`;

// ---- Validation ----
export interface ValidationIssue {
  level: 'error' | 'warning';
  pairKey: string;
  field: string;
  message: string;
}

function validateConfig(pairKey: string, cfg: BehaviorConfig): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  if (cfg.methods.length === 0) {
    out.push({ level: 'error', pairKey, field: 'methods', message: 'Select at least one data method.' });
  }
  if (cfg.methods.includes('interval')) {
    const { samplingSec, intervalSec, totalMin, type } = cfg.interval;
    if (!Number.isFinite(samplingSec) || samplingSec < 1) {
      out.push({ level: 'error', pairKey, field: 'samplingSec', message: 'Sampling must be ≥ 1 second.' });
    } else if (samplingSec > 600) {
      out.push({ level: 'warning', pairKey, field: 'samplingSec', message: 'Sampling > 10 min is unusually long.' });
    }
    if (!Number.isFinite(intervalSec) || intervalSec < 1) {
      out.push({ level: 'error', pairKey, field: 'intervalSec', message: 'Interval must be ≥ 1 second.' });
    } else if (intervalSec > 600) {
      out.push({ level: 'warning', pairKey, field: 'intervalSec', message: 'Interval > 10 min is unusually long.' });
    }
    if (type === 'momentary' && samplingSec > intervalSec) {
      out.push({ level: 'error', pairKey, field: 'samplingSec', message: 'Momentary sampling must be ≤ interval length.' });
    }
    if (!Number.isFinite(totalMin) || totalMin < 1) {
      out.push({ level: 'error', pairKey, field: 'totalMin', message: 'Total session must be ≥ 1 minute.' });
    } else if (totalMin > 240) {
      out.push({ level: 'warning', pairKey, field: 'totalMin', message: 'Total session > 4 hours — confirm.' });
    }
    const expectedIntervals = Math.floor((totalMin * 60) / Math.max(intervalSec, 1));
    if (expectedIntervals < 3) {
      out.push({ level: 'warning', pairKey, field: 'totalMin', message: `Only ${expectedIntervals} intervals will be sampled.` });
    }
  }
  if (cfg.methods.includes('duration')) {
    const { autoStopSec } = cfg.duration;
    if (!Number.isFinite(autoStopSec) || autoStopSec < 0) {
      out.push({ level: 'error', pairKey, field: 'autoStopSec', message: 'Auto-stop must be ≥ 0 (0 = off).' });
    } else if (autoStopSec > 0 && autoStopSec < 5) {
      out.push({ level: 'warning', pairKey, field: 'autoStopSec', message: 'Auto-stop < 5s may end episodes prematurely.' });
    } else if (autoStopSec > 3600) {
      out.push({ level: 'warning', pairKey, field: 'autoStopSec', message: 'Auto-stop > 1 hour is unusually long.' });
    }
  }
  if (cfg.methods.includes('frequency') && cfg.frequency.mode === 'bouts') {
    if (!Number.isFinite(cfg.frequency.minIrtSec) || cfg.frequency.minIrtSec < 0) {
      out.push({ level: 'error', pairKey, field: 'minIrtSec', message: 'Min IRT must be ≥ 0.' });
    }
  }
  return out;
}

function loadTemplates(): ConfigTemplate[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_TEMPLATES) || '[]'); } catch { return []; }
}
function saveTemplates(list: ConfigTemplate[]) {
  localStorage.setItem(STORAGE_TEMPLATES, JSON.stringify(list));
}
function loadDraft(): SavedDraft | null {
  try {
    const raw = localStorage.getItem(STORAGE_DRAFT);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d?.configs) return null;
    return d as SavedDraft;
  } catch { return null; }
}

function csvCell(v: any) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function downloadFile(filename: string, content: string | Blob, mime = 'text/csv') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function MultiStudentSessionBuilder() {
  const { toast } = useToast();
  const students = useDataStore((s) => s.students);
  const selectStudent = useDataStore((s) => s.toggleStudentSelection);
  const selectedStudentIds = useDataStore((s) => s.selectedStudentIds);
  const addBehaviorWithMethods = useDataStore((s) => s.addBehaviorWithMethods);
  const updateBehaviorMethods = useDataStore((s) => s.updateBehaviorMethods);
  const abcEntries = useDataStore((s) => s.abcEntries);
  const frequencyEntries = useDataStore((s) => s.frequencyEntries);
  const durationEntries = useDataStore((s) => s.durationEntries);
  const intervalEntries = useDataStore((s) => s.intervalEntries);

  const startSessionInStore = useDataStore((s) => s.startSession);

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'setup' | 'review' | 'drafts' | 'templates'>('setup');
  const [chosenStudents, setChosenStudents] = useState<string[]>([]);
  const [chosenBehaviors, setChosenBehaviors] = useState<Record<string, string[]>>({});
  const [configs, setConfigs] = useState<Record<string, BehaviorConfig>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [templates, setTemplates] = useState<ConfigTemplate[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [hasDraft, setHasDraft] = useState(false);
  const [draftAt, setDraftAt] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID());
  const [cloudDrafts, setCloudDrafts] = useState<SavedDraft[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [exportSessionId, setExportSessionId] = useState<string>('current');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error' | 'offline'>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const pendingSyncRef = useRef(false);

  const activeStudents = useMemo(() => students.filter((s) => !s.isArchived), [students]);

  // Validate all selected pairs
  const issues = useMemo<ValidationIssue[]>(() => {
    const list: ValidationIssue[] = [];
    chosenStudents.forEach((sid) => {
      (chosenBehaviors[sid] || []).forEach((bid) => {
        const k = key(sid, bid);
        list.push(...validateConfig(k, configs[k] || defaultConfig()));
      });
    });
    return list;
  }, [chosenStudents, chosenBehaviors, configs]);
  const errorCount = issues.filter((i) => i.level === 'error').length;
  const warningCount = issues.filter((i) => i.level === 'warning').length;

  // Load drafts (local + cloud) on open
  const loadCloudDrafts = useCallback(async () => {
    setLoadingDrafts(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setCloudDrafts([]); return; }
      const { data, error } = await supabase
        .from('multi_student_session_drafts' as any)
        .select('session_id, chosen_students, chosen_behaviors, configs, updated_at')
        .order('updated_at', { ascending: false })
        .limit(50);
      if (error || !data) { setCloudDrafts([]); return; }
      const list: SavedDraft[] = (data as any[]).map((d) => ({
        at: new Date(d.updated_at).getTime(),
        sessionId: d.session_id,
        chosenStudents: d.chosen_students || [],
        chosenBehaviors: d.chosen_behaviors || {},
        configs: d.configs || {},
      }));
      setCloudDrafts(list);
    } catch {
      setCloudDrafts([]);
    } finally {
      setLoadingDrafts(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setTemplates(loadTemplates());
    const d = loadDraft();
    setHasDraft(!!d);
    setDraftAt(d?.at ?? null);
    loadCloudDrafts();
  }, [open, loadCloudDrafts]);

  const toggleStudent = (sid: string) => {
    setChosenStudents((prev) => (prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid]));
    setExpanded((p) => ({ ...p, [sid]: true }));
  };

  const toggleBehavior = (sid: string, bid: string) => {
    setChosenBehaviors((prev) => {
      const cur = prev[sid] || [];
      const next = cur.includes(bid) ? cur.filter((x) => x !== bid) : [...cur, bid];
      return { ...prev, [sid]: next };
    });
    const k = key(sid, bid);
    setConfigs((prev) => (prev[k] ? prev : { ...prev, [k]: defaultConfig() }));
  };

  const updateConfig = (sid: string, bid: string, updater: (c: BehaviorConfig) => BehaviorConfig) => {
    const k = key(sid, bid);
    setConfigs((prev) => ({ ...prev, [k]: updater(prev[k] || defaultConfig()) }));
  };

  const totalPairs = chosenStudents.reduce((acc, sid) => acc + (chosenBehaviors[sid]?.length || 0), 0);

  const persistDraft = useCallback(
    async (cs: string[], cb: Record<string, string[]>, cfgs: Record<string, BehaviorConfig>, sid: string) => {
      const d: SavedDraft = { at: Date.now(), sessionId: sid, chosenStudents: cs, chosenBehaviors: cb, configs: cfgs };
      try { localStorage.setItem(STORAGE_DRAFT, JSON.stringify(d)); } catch {}

      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        enqueueDraft({ sessionId: sid, chosenStudents: cs, chosenBehaviors: cb, configs: cfgs as any, queuedAt: Date.now() });
        pendingSyncRef.current = true;
        setSyncStatus('offline');
        return;
      }

      setSyncStatus('saving');
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setSyncStatus('idle');
          return;
        }
        const merged = await syncDraft(
          sid,
          { chosenStudents: cs, chosenBehaviors: cb, configs: cfgs as any, updatedAt: Date.now() },
          user.id
        );
        // Adopt any remote edits that the merge pulled in.
        const changed =
          JSON.stringify([cs, cb, cfgs]) !==
          JSON.stringify([merged.chosenStudents, merged.chosenBehaviors, merged.configs]);
        if (changed) {
          setChosenStudents(merged.chosenStudents);
          setChosenBehaviors(merged.chosenBehaviors);
          setConfigs(merged.configs as any);
          toast({ title: 'Merged changes from another device' });
        }
        dequeue(sid);
        pendingSyncRef.current = false;
        setLastSyncedAt(Date.now());
        setSyncStatus('saved');
      } catch {
        // Persist to offline queue so it syncs (and merges) on next app open
        enqueueDraft({ sessionId: sid, chosenStudents: cs, chosenBehaviors: cb, configs: cfgs as any, queuedAt: Date.now() });
        pendingSyncRef.current = true;
        setSyncStatus('error');
      }
    },
    []
  );

  // Auto-save draft on changes (debounced)
  useEffect(() => {
    if (!open || (chosenStudents.length === 0 && Object.keys(configs).length === 0)) return;
    const t = setTimeout(() => {
      persistDraft(chosenStudents, chosenBehaviors, configs, sessionId);
    }, 800);
    return () => clearTimeout(t);
  }, [open, chosenStudents, chosenBehaviors, configs, sessionId, persistDraft]);

  // Track queued (pending offline) drafts so the UI can surface them.
  const [queuedCount, setQueuedCount] = useState(0);
  useEffect(() => subscribeQueue(setQueuedCount), []);

  // Drain queue on mount/open and when connectivity returns.
  useEffect(() => {
    if (!open) return;
    void drainQueue();
    const retry = () => {
      if (typeof navigator === 'undefined' || navigator.onLine) {
        void drainQueue();
        if (pendingSyncRef.current) {
          persistDraft(chosenStudents, chosenBehaviors, configs, sessionId);
        }
      }
    };
    const onVisibility = () => { if (document.visibilityState === 'visible') retry(); };
    window.addEventListener('online', retry);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('online', retry);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [open, chosenStudents, chosenBehaviors, configs, sessionId, persistDraft]);

  const applyDraft = (d: SavedDraft) => {
    setSessionId(d.sessionId || crypto.randomUUID());
    setChosenStudents(d.chosenStudents || []);
    setChosenBehaviors(d.chosenBehaviors || {});
    setConfigs(d.configs || {});
    const exp: Record<string, boolean> = {};
    (d.chosenStudents || []).forEach((s) => { exp[s] = true; });
    setExpanded(exp);
    toast({ title: 'Session resumed', description: `Restored from ${new Date(d.at).toLocaleString()}.` });
  };

  const handleResume = () => {
    const d = loadDraft();
    if (d) applyDraft(d);
  };

  const handleDeleteCloudDraft = async (sid: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('multi_student_session_drafts' as any)
        .delete().eq('user_id', user.id).eq('session_id', sid);
      setCloudDrafts((prev) => prev.filter((d) => d.sessionId !== sid));
      toast({ title: 'Draft deleted' });
    } catch {
      toast({ title: 'Failed to delete draft', variant: 'destructive' });
    }
  };

  const copySessionId = async () => {
    try {
      await navigator.clipboard.writeText(sessionId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 1500);
    } catch {}
  };

  const handleStart = () => {
    if (chosenStudents.length === 0 || totalPairs === 0) return;
    if (errorCount > 0) {
      toast({
        title: `Fix ${errorCount} configuration error${errorCount === 1 ? '' : 's'}`,
        description: 'Resolve the highlighted issues before starting.',
        variant: 'destructive',
      });
      return;
    }
    // Set the session id so all captured entries reference it
    startSessionInStore(undefined, sessionId);
    chosenStudents.forEach((sid) => {
      if (!selectedStudentIds.includes(sid)) selectStudent(sid);
      const student = students.find((s) => s.id === sid);
      (chosenBehaviors[sid] || []).forEach((bid) => {
        const cfg = configs[key(sid, bid)] || defaultConfig();
        const existing = student?.behaviors.find((b) => b.id === bid);
        if (existing) {
          updateBehaviorMethods(sid, bid, cfg.methods);
        } else {
          addBehaviorWithMethods(sid, 'New Behavior', cfg.methods);
        }
      });
    });
    persistDraft(chosenStudents, chosenBehaviors, configs, sessionId);
    toast({
      title: 'Session started',
      description: `Session ${sessionId.slice(0, 8)} · ${chosenStudents.length} student(s), ${totalPairs} behavior(s)${warningCount ? ` · ${warningCount} warning(s)` : ''}.`,
    });
    setOpen(false);
  };

  // ----- Templates -----
  const handleSaveTemplate = (cfg: BehaviorConfig) => {
    if (!templateName.trim()) {
      toast({ title: 'Name required', variant: 'destructive' });
      return;
    }
    const next: ConfigTemplate[] = [
      ...templates,
      { id: crypto.randomUUID(), name: templateName.trim(), config: cfg, createdAt: Date.now() },
    ];
    setTemplates(next);
    saveTemplates(next);
    setTemplateName('');
    toast({ title: 'Template saved' });
  };
  const handleDeleteTemplate = (id: string) => {
    const next = templates.filter((t) => t.id !== id);
    setTemplates(next); saveTemplates(next);
  };
  const handleApplyTemplateToAll = (tpl: ConfigTemplate) => {
    if (totalPairs === 0) {
      toast({ title: 'Select students/behaviors first', variant: 'destructive' });
      return;
    }
    const next = { ...configs };
    chosenStudents.forEach((sid) => {
      (chosenBehaviors[sid] || []).forEach((bid) => {
        next[key(sid, bid)] = JSON.parse(JSON.stringify(tpl.config));
      });
    });
    setConfigs(next);
    toast({ title: `Applied "${tpl.name}"`, description: `${totalPairs} behavior(s) updated.` });
  };

  // ----- Review -----
  const reviewRows = useMemo(() => {
    const rows: Array<{
      sid: string; sname: string; bid: string; bname: string;
      freq: number; durSec: number; intMarked: number; intTotal: number; abc: number;
    }> = [];
    chosenStudents.forEach((sid) => {
      const student = students.find((s) => s.id === sid);
      (chosenBehaviors[sid] || []).forEach((bid) => {
        const beh = student?.behaviors.find((b) => b.id === bid);
        const fEntries = frequencyEntries.filter((e) => e.studentId === sid && e.behaviorId === bid);
        const dEntries = durationEntries.filter((e) => e.studentId === sid && e.behaviorId === bid);
        const iEntries = intervalEntries.filter((e) => e.studentId === sid && e.behaviorId === bid);
        const aEntries = abcEntries.filter((e) => e.studentId === sid && e.behaviorId === bid);
        rows.push({
          sid, sname: student?.displayName || student?.name || sid,
          bid, bname: beh?.name || bid,
          freq: fEntries.reduce((sum, e) => sum + (e.count || 0), 0),
          durSec: dEntries.reduce((sum, e) => sum + (e.duration || 0), 0),
          intMarked: iEntries.filter((e) => e.occurred && !e.voided).length,
          intTotal: iEntries.filter((e) => !e.voided).length,
          abc: aEntries.length,
        });
      });
    });
    return rows;
  }, [chosenStudents, chosenBehaviors, students, frequencyEntries, durationEntries, intervalEntries, abcEntries]);

  // Available session ids across all entry types (for per-session exports)
  const availableSessionIds = useMemo(() => {
    const ids = new Set<string>();
    [...frequencyEntries, ...durationEntries, ...intervalEntries, ...abcEntries]
      .forEach((e: any) => { if (e.sessionId) ids.add(e.sessionId); });
    ids.add(sessionId); // always include current
    return Array.from(ids);
  }, [frequencyEntries, durationEntries, intervalEntries, abcEntries, sessionId]);

  // ----- Exports -----
  // sessionFilter: undefined = current session id; '__all__' = no filter; specific id = that session only
  const exportCSV = (sid?: string, bid?: string, sessionFilter?: string) => {
    const effectiveSession = sessionFilter === undefined ? sessionId : sessionFilter;
    const matchSession = (e: any) =>
      effectiveSession === '__all__' ? true : (e.sessionId || '') === effectiveSession;
    const rows: string[] = [];
    rows.push(['Student', 'Behavior', 'Type', 'Timestamp', 'Value', 'Detail', 'SessionId'].map(csvCell).join(','));
    const inScope = (e: any) =>
      (!sid || e.studentId === sid) && (!bid || e.behaviorId === bid) && matchSession(e);
    const sname = (id: string) => {
      const s = students.find((x) => x.id === id);
      return s?.displayName || s?.name || id;
    };
    const bname = (sId: string, bId: string) => {
      const s = students.find((x) => x.id === sId);
      return s?.behaviors.find((b) => b.id === bId)?.name || bId;
    };
    frequencyEntries.filter(inScope).forEach((e) => {
      rows.push([sname(e.studentId), bname(e.studentId, e.behaviorId), 'frequency',
        new Date(e.timestamp).toISOString(), e.count, '', e.sessionId || ''].map(csvCell).join(','));
    });
    durationEntries.filter(inScope).forEach((e) => {
      rows.push([sname(e.studentId), bname(e.studentId, e.behaviorId), 'duration',
        new Date(e.startTime).toISOString(), `${e.duration}s`,
        e.endTime ? new Date(e.endTime).toISOString() : '', e.sessionId || ''].map(csvCell).join(','));
    });
    intervalEntries.filter(inScope).forEach((e) => {
      rows.push([sname(e.studentId), bname(e.studentId, e.behaviorId), 'interval',
        new Date(e.timestamp).toISOString(), e.occurred ? 'occurred' : 'no',
        `interval ${e.intervalNumber}${e.voided ? ' (voided)' : ''}`, e.sessionId || ''].map(csvCell).join(','));
    });
    abcEntries.filter(inScope).forEach((e) => {
      rows.push([sname(e.studentId), bname(e.studentId, e.behaviorId), 'abc',
        new Date(e.timestamp).toISOString(), e.behavior,
        `A:${e.antecedent} | C:${e.consequence}`, e.sessionId || ''].map(csvCell).join(','));
    });
    const sessionTag = effectiveSession === '__all__' ? 'all-sessions' : effectiveSession.slice(0, 8);
    const fname = `session_${sessionTag}_${sid ? sname(sid).replace(/\W+/g, '_') : 'all'}${bid ? '_' + bname(sid!, bid).replace(/\W+/g, '_') : ''}.csv`;
    const header = `# Session ID: ${effectiveSession}\n# Generated: ${new Date().toISOString()}\n# Records: ${rows.length - 1}\n`;
    downloadFile(fname, header + rows.join('\n'));
    toast({ title: 'CSV exported', description: `${fname} · ${rows.length - 1} record(s)` });
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    let y = 14;
    doc.setFontSize(14); doc.text('Multi-Student Session Summary', 14, y); y += 8;
    doc.setFontSize(9);
    doc.text(`Session ID: ${sessionId}`, 14, y); y += 5;
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, y); y += 6;
    doc.text(`Students: ${chosenStudents.length}  ·  Behaviors: ${totalPairs}`, 14, y); y += 8;
    doc.setFontSize(10);
    doc.text('Student / Behavior', 14, y);
    doc.text('Freq', 110, y); doc.text('Dur(s)', 130, y); doc.text('Int', 155, y); doc.text('ABC', 175, y);
    y += 4; doc.line(14, y, 196, y); y += 5;
    reviewRows.forEach((r) => {
      if (y > 280) { doc.addPage(); y = 14; }
      doc.text(`${r.sname} — ${r.bname}`.slice(0, 60), 14, y);
      doc.text(String(r.freq), 110, y);
      doc.text(String(r.durSec), 130, y);
      doc.text(`${r.intMarked}/${r.intTotal}`, 155, y);
      doc.text(String(r.abc), 175, y);
      y += 6;
    });
    doc.save(`session_${sessionId.slice(0, 8)}_summary.pdf`);
    toast({ title: 'PDF exported' });
  };

  // ----- Render -----
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 shrink-0">
          <Users className="w-4 h-4" />
          <span className="hidden sm:inline">Multi-Student Session</span>
          <span className="sm:hidden">Multi</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Multi-Student Session</DialogTitle>
        </DialogHeader>

        {/* Session ID — referenced by every captured record & export */}
        <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded p-2 text-xs gap-2">
          <span className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-muted-foreground shrink-0">Session ID:</span>
            <code className="font-mono text-[11px] bg-background px-1.5 py-0.5 rounded border truncate">
              {sessionId}
            </code>
          </span>
          <span className="flex items-center gap-2 shrink-0">
            <span
              className="flex items-center gap-1 text-[11px] text-muted-foreground"
              title={lastSyncedAt ? `Last synced ${new Date(lastSyncedAt).toLocaleTimeString()}` : 'Auto-syncs as you edit'}
            >
              {syncStatus === 'saving' && (<><Loader2 className="w-3 h-3 animate-spin" /> Saving…</>)}
              {syncStatus === 'saved' && (<><Cloud className="w-3 h-3 text-green-600" /> Saved{lastSyncedAt ? ` ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</>)}
              {syncStatus === 'offline' && (<><CloudOff className="w-3 h-3 text-amber-600" /> Offline — will sync</>)}
              {syncStatus === 'error' && (<><CloudOff className="w-3 h-3 text-destructive" /> Sync failed — retrying</>)}
              {syncStatus === 'idle' && (<><Cloud className="w-3 h-3 opacity-50" /> Auto-sync on</>)}
              {queuedCount > 0 && (
                <span
                  className="ml-1 inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 text-[10px] font-medium"
                  title={`${queuedCount} draft${queuedCount > 1 ? 's' : ''} waiting to sync`}
                >
                  <CloudOff className="w-2.5 h-2.5" /> {queuedCount} queued
                </span>
              )}
            </span>
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={copySessionId}>
              {copiedId ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </Button>
          </span>
        </div>

        {hasDraft && (
          <div className="flex items-center justify-between bg-muted/40 border rounded p-2 text-xs">
            <span>
              <RotateCcw className="w-3 h-3 inline mr-1" />
              Local draft from {draftAt ? new Date(draftAt).toLocaleString() : ''}
            </span>
            <Button size="sm" variant="ghost" onClick={handleResume}>Resume</Button>
          </div>
        )}

        {cloudDrafts.length > 0 && (
          <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/30 rounded p-2 text-xs">
            <span>
              <Cloud className="w-3 h-3 inline mr-1" />
              {cloudDrafts.length} cloud draft{cloudDrafts.length === 1 ? '' : 's'} available
            </span>
            <Button size="sm" variant="ghost" onClick={() => setTab('drafts')}>Open Drafts</Button>
          </div>
        )}

        {(errorCount > 0 || warningCount > 0) && (
          <div className={`border rounded p-2 text-xs space-y-1 ${errorCount > 0 ? 'bg-destructive/10 border-destructive/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
            <div className="flex items-center gap-1 font-semibold">
              <AlertTriangle className="w-3 h-3" />
              {errorCount > 0 && <span>{errorCount} error{errorCount === 1 ? '' : 's'}</span>}
              {errorCount > 0 && warningCount > 0 && <span>·</span>}
              {warningCount > 0 && <span>{warningCount} warning{warningCount === 1 ? '' : 's'}</span>}
            </div>
            <ul className="list-disc list-inside space-y-0.5 max-h-24 overflow-y-auto">
              {issues.slice(0, 6).map((i, idx) => (
                <li key={idx} className={i.level === 'error' ? 'text-destructive' : 'text-amber-700 dark:text-amber-400'}>
                  <span className="font-medium">{i.field}:</span> {i.message}
                </li>
              ))}
              {issues.length > 6 && <li className="text-muted-foreground">+ {issues.length - 6} more…</li>}
            </ul>
          </div>
        )}

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="self-start">
            <TabsTrigger value="setup">Setup</TabsTrigger>
            <TabsTrigger value="review">Review ({reviewRows.length})</TabsTrigger>
            <TabsTrigger value="drafts">Drafts ({cloudDrafts.length})</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          {/* SETUP */}
          <TabsContent value="setup" className="flex-1 overflow-y-auto space-y-4 mt-2">
            <section className="space-y-2">
              <Label className="text-sm font-semibold">1. Select Students</Label>
              <div className="border rounded-lg p-2 max-h-48 overflow-y-auto">
                {activeStudents.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-2">No active students.</p>
                ) : activeStudents.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer">
                    <Checkbox checked={chosenStudents.includes(s.id)} onCheckedChange={() => toggleStudent(s.id)} />
                    <span className="text-sm">{s.displayName || s.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{s.behaviors.length} behavior(s)</span>
                  </label>
                ))}
              </div>
            </section>

            {chosenStudents.length > 0 && templates.length > 0 && (
              <section className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Layers className="w-4 h-4" /> Quick-apply template
                </Label>
                <div className="flex flex-wrap gap-2">
                  {templates.map((t) => (
                    <Button key={t.id} size="sm" variant="secondary" onClick={() => handleApplyTemplateToAll(t)}>
                      {t.name}
                    </Button>
                  ))}
                </div>
              </section>
            )}

            {chosenStudents.length > 0 && (
              <section className="space-y-2">
                <Label className="text-sm font-semibold">2. Choose Behaviors & Configure</Label>
                <div className="space-y-3">
                  {chosenStudents.map((sid) => {
                    const student = students.find((s) => s.id === sid);
                    if (!student) return null;
                    const isOpen = expanded[sid] !== false;
                    return (
                      <div key={sid} className="border rounded-lg">
                        <button type="button"
                          className="w-full flex items-center gap-2 p-3 text-left hover:bg-muted/30"
                          onClick={() => setExpanded((p) => ({ ...p, [sid]: !isOpen }))}>
                          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          <span className="font-medium text-sm">{student.displayName || student.name}</span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {(chosenBehaviors[sid] || []).length}/{student.behaviors.length} selected
                          </span>
                        </button>
                        {isOpen && (
                          <div className="p-3 pt-0 space-y-2">
                            {student.behaviors.length === 0 ? (
                              <p className="text-xs text-muted-foreground py-2">No behaviors configured.</p>
                            ) : student.behaviors.filter((b) => !b.isArchived).map((b) => {
                              const isChosen = (chosenBehaviors[sid] || []).includes(b.id);
                              const cfg = configs[key(sid, b.id)] || defaultConfig();
                              return (
                                <div key={b.id} className="border rounded-md">
                                  <label className="flex items-center gap-2 p-2 cursor-pointer">
                                    <Checkbox checked={isChosen} onCheckedChange={() => toggleBehavior(sid, b.id)} />
                                    <span className="text-sm flex-1">{b.name}</span>
                                    {isChosen && <Settings2 className="w-3 h-3 text-muted-foreground" />}
                                  </label>
                                  {isChosen && (
                                    <div className="px-3 pb-3 space-y-3 border-t bg-muted/20">
                                      <div className="pt-3">
                                        <Label className="text-xs">Methods</Label>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                          {METHODS.map((m) => (
                                            <label key={m.value} className="flex items-center gap-1 text-xs cursor-pointer">
                                              <Checkbox checked={cfg.methods.includes(m.value)}
                                                onCheckedChange={() => updateConfig(sid, b.id, (c) => ({
                                                  ...c, methods: c.methods.includes(m.value)
                                                    ? c.methods.filter((x) => x !== m.value)
                                                    : [...c.methods, m.value],
                                                }))} />
                                              {m.label}
                                            </label>
                                          ))}
                                        </div>
                                      </div>

                                      {cfg.methods.includes('interval') && (
                                        <div className="grid grid-cols-2 gap-2 p-2 bg-background rounded border">
                                          <div className="col-span-2 text-xs font-semibold text-muted-foreground">Interval</div>
                                          <div>
                                            <Label className="text-xs">Type</Label>
                                            <Select value={cfg.interval.type}
                                              onValueChange={(v: IntervalType) => updateConfig(sid, b.id, (c) => ({ ...c, interval: { ...c.interval, type: v } }))}>
                                              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="whole">Whole</SelectItem>
                                                <SelectItem value="partial">Partial</SelectItem>
                                                <SelectItem value="momentary">Momentary</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          <div>
                                            <Label className="text-xs">Sampling (sec)</Label>
                                            <Input type="number" className="h-8" value={cfg.interval.samplingSec}
                                              onChange={(e) => updateConfig(sid, b.id, (c) => ({ ...c, interval: { ...c.interval, samplingSec: Number(e.target.value) } }))} />
                                          </div>
                                          <div>
                                            <Label className="text-xs">Interval (sec)</Label>
                                            <Input type="number" className="h-8" value={cfg.interval.intervalSec}
                                              onChange={(e) => updateConfig(sid, b.id, (c) => ({ ...c, interval: { ...c.interval, intervalSec: Number(e.target.value) } }))} />
                                          </div>
                                          <div>
                                            <Label className="text-xs">Total (min)</Label>
                                            <Input type="number" className="h-8" value={cfg.interval.totalMin}
                                              onChange={(e) => updateConfig(sid, b.id, (c) => ({ ...c, interval: { ...c.interval, totalMin: Number(e.target.value) } }))} />
                                          </div>
                                          <div className="col-span-2 flex items-center justify-between">
                                            <Label className="text-xs">Sync with other students</Label>
                                            <Switch checked={cfg.interval.sync}
                                              onCheckedChange={(v) => updateConfig(sid, b.id, (c) => ({ ...c, interval: { ...c.interval, sync: v } }))} />
                                          </div>
                                        </div>
                                      )}

                                      {cfg.methods.includes('frequency') && (
                                        <div className="grid grid-cols-2 gap-2 p-2 bg-background rounded border">
                                          <div className="col-span-2 text-xs font-semibold text-muted-foreground">Frequency</div>
                                          <div>
                                            <Label className="text-xs">Count rule</Label>
                                            <Select value={cfg.frequency.mode}
                                              onValueChange={(v: FrequencyMode) => updateConfig(sid, b.id, (c) => ({ ...c, frequency: { ...c.frequency, mode: v } }))}>
                                              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="occurrence">Per occurrence</SelectItem>
                                                <SelectItem value="bouts">Bouts (IRT)</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          {cfg.frequency.mode === 'bouts' && (
                                            <div>
                                              <Label className="text-xs">Min IRT (sec)</Label>
                                              <Input type="number" className="h-8" value={cfg.frequency.minIrtSec}
                                                onChange={(e) => updateConfig(sid, b.id, (c) => ({ ...c, frequency: { ...c.frequency, minIrtSec: Number(e.target.value) } }))} />
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {cfg.methods.includes('duration') && (
                                        <div className="grid grid-cols-2 gap-2 p-2 bg-background rounded border">
                                          <div className="col-span-2 text-xs font-semibold text-muted-foreground">Duration</div>
                                          <div>
                                            <Label className="text-xs">Stopwatch</Label>
                                            <Select value={cfg.duration.mode}
                                              onValueChange={(v: DurationMode) => updateConfig(sid, b.id, (c) => ({ ...c, duration: { ...c.duration, mode: v } }))}>
                                              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="cumulative">Cumulative</SelectItem>
                                                <SelectItem value="per_episode">Per episode</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          <div>
                                            <Label className="text-xs">Auto-stop (sec, 0=off)</Label>
                                            <Input type="number" className="h-8" value={cfg.duration.autoStopSec}
                                              onChange={(e) => updateConfig(sid, b.id, (c) => ({ ...c, duration: { ...c.duration, autoStopSec: Number(e.target.value) } }))} />
                                          </div>
                                        </div>
                                      )}

                                      <div className="flex gap-2 items-center">
                                        <Input placeholder="Save as template…" className="h-8 text-xs"
                                          value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
                                        <Button size="sm" variant="outline" onClick={() => handleSaveTemplate(cfg)}>
                                          <Save className="w-3 h-3 mr-1" /> Save
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </TabsContent>

          {/* REVIEW */}
          <TabsContent value="review" className="flex-1 overflow-y-auto mt-2">
            {reviewRows.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center">
                Select students and behaviors in Setup to see captured data here.
              </p>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 justify-between bg-muted/30 border rounded p-2">
                  <div className="flex items-center gap-2 text-xs">
                    <Label className="text-xs whitespace-nowrap">Export Session:</Label>
                    <Select value={exportSessionId} onValueChange={setExportSessionId}>
                      <SelectTrigger className="h-8 w-[260px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="current">Current ({sessionId.slice(0, 8)})</SelectItem>
                        <SelectItem value="__all__">All sessions</SelectItem>
                        {availableSessionIds.filter((id) => id !== sessionId).map((id) => (
                          <SelectItem key={id} value={id}>{id.slice(0, 8)}…</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => exportCSV(undefined, undefined, exportSessionId === 'current' ? undefined : exportSessionId)}>
                      <FileDown className="w-3 h-3 mr-1" /> Export CSV
                    </Button>
                    <Button size="sm" variant="outline" onClick={exportPDF}>
                      <FileText className="w-3 h-3 mr-1" /> Export PDF
                    </Button>
                  </div>
                </div>
                <div className="border rounded">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-2">Student</th>
                        <th className="text-left p-2">Behavior</th>
                        <th className="text-right p-2">Freq</th>
                        <th className="text-right p-2">Dur (s)</th>
                        <th className="text-right p-2">Interval</th>
                        <th className="text-right p-2">ABC</th>
                        <th className="text-right p-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviewRows.map((r) => (
                        <tr key={`${r.sid}-${r.bid}`} className="border-t">
                          <td className="p-2">{r.sname}</td>
                          <td className="p-2">{r.bname}</td>
                          <td className="p-2 text-right">{r.freq}</td>
                          <td className="p-2 text-right">{r.durSec}</td>
                          <td className="p-2 text-right">{r.intMarked}/{r.intTotal}</td>
                          <td className="p-2 text-right">{r.abc}</td>
                          <td className="p-2 text-right">
                            <Button size="sm" variant="ghost" title="Export this row for selected session"
                              onClick={() => exportCSV(r.sid, r.bid, exportSessionId === 'current' ? undefined : exportSessionId)}>
                              <FileDown className="w-3 h-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>

          {/* DRAFTS */}
          <TabsContent value="drafts" className="flex-1 overflow-y-auto mt-2 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Saved multi-student session drafts (cloud-synced, resumable from any device).
              </p>
              <Button size="sm" variant="ghost" onClick={loadCloudDrafts} disabled={loadingDrafts}>
                {loadingDrafts ? 'Loading…' : 'Refresh'}
              </Button>
            </div>
            {hasDraft && draftAt && (
              <div className="border rounded p-3 flex items-center gap-3 bg-muted/20">
                <RotateCcw className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">Local draft (this device)</div>
                  <div className="text-xs text-muted-foreground">
                    Last updated {new Date(draftAt).toLocaleString()}
                  </div>
                </div>
                <Button size="sm" variant="secondary" onClick={handleResume}>Resume</Button>
              </div>
            )}
            {cloudDrafts.length === 0 && !loadingDrafts ? (
              <p className="text-sm text-muted-foreground p-4 text-center">
                No saved drafts. Configure a session in Setup — it auto-saves as you work.
              </p>
            ) : cloudDrafts.map((d) => {
              const studentCount = d.chosenStudents.length;
              const behaviorCount = Object.values(d.chosenBehaviors).reduce((a, b) => a + (b?.length || 0), 0);
              const isCurrent = d.sessionId === sessionId;
              return (
                <div key={d.sessionId} className={`border rounded p-3 flex items-center gap-3 ${isCurrent ? 'border-primary/40 bg-primary/5' : ''}`}>
                  <Cloud className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-xs bg-background px-1.5 py-0.5 rounded border truncate">
                        {d.sessionId}
                      </code>
                      {isCurrent && <span className="text-[10px] uppercase font-semibold text-primary">Current</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {studentCount} student{studentCount === 1 ? '' : 's'} · {behaviorCount} behavior{behaviorCount === 1 ? '' : 's'} · updated {new Date(d.at).toLocaleString()}
                    </div>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => applyDraft(d)} disabled={isCurrent}>
                    Resume
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDeleteCloudDraft(d.sessionId)} title="Delete draft">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              );
            })}
          </TabsContent>

          {/* TEMPLATES */}
          <TabsContent value="templates" className="flex-1 overflow-y-auto mt-2 space-y-2">
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center">
                No templates yet. Save a configuration from Setup to reuse it across students/behaviors.
              </p>
            ) : templates.map((t) => (
              <div key={t.id} className="border rounded p-3 flex items-center gap-3">
                <div className="flex-1">
                  <div className="font-medium text-sm">{t.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.config.methods.join(', ')} ·
                    {t.config.methods.includes('interval') &&
                      ` ${t.config.interval.type} ${t.config.interval.intervalSec}s`}
                  </div>
                </div>
                <Button size="sm" variant="secondary" onClick={() => handleApplyTemplateToAll(t)}>
                  Apply to selected
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDeleteTemplate(t.id)}>
                  Delete
                </Button>
              </div>
            ))}
          </TabsContent>
        </Tabs>

        <div className="flex justify-between items-center pt-3 border-t">
          <span className="text-xs text-muted-foreground">
            {chosenStudents.length} student(s) · {totalPairs} behavior(s)
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
            {tab === 'setup' && (
              <Button onClick={handleStart} disabled={totalPairs === 0 || errorCount > 0}>
                Start Session{errorCount > 0 ? ` (${errorCount} error${errorCount === 1 ? '' : 's'})` : ''}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
