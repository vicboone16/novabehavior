import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, RefreshCw, CheckCircle2, AlertTriangle, Link2Off, Database, Trash2, Wand2, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UnmappedRow {
  student_name: string;
  behavior_subtype: string | null;
  behavior_entry_id: string | null;
  bank_behavior_id: string | null;
}

interface OrphanRow {
  student_name: string;
  session_id: string;
  behavior_id: string;
  total_frequency: number;
  total_duration: number;
  row_count: number;
}

interface MissingLinkRow {
  student_name: string;
  behavior_subtype: string | null;
  bank_behavior_id: string;
}

const maskUuid = (id: string | null | undefined) =>
  id ? `${id.slice(0, 8)}…` : '—';

interface CanonicalBehavior {
  id: string;
  name: string;
  domain_name?: string;
}

export default function IntegrityCheck() {
  const [loading, setLoading] = useState(false);
  const [unmapped, setUnmapped] = useState<UnmappedRow[]>([]);
  const [orphans, setOrphans] = useState<OrphanRow[]>([]);
  const [missing, setMissing] = useState<MissingLinkRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Orphan mapping wizard state
  const [canonicalBehaviors, setCanonicalBehaviors] = useState<CanonicalBehavior[]>([]);
  const [mappingOrphan, setMappingOrphan] = useState<OrphanRow | null>(null);
  const [mappingTarget, setMappingTarget] = useState<string>('');
  const [mappingRule, setMappingRule] = useState<'remap' | 'delete'>('remap');
  const [applyingMapping, setApplyingMapping] = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1) canonical nt_behaviors id set
      const { data: canon } = await supabase.from('nt_behaviors').select('id, name, domain_name');
      setCanonicalBehaviors(
        (canon ?? []).map((r: any) => ({ id: r.id, name: r.name, domain_name: r.domain_name }))
      );
      const canonIds = new Set((canon ?? []).map((r: any) => r.id));

      // 2) sbm + students
      const { data: sbm } = await supabase
        .from('student_behavior_map')
        .select('student_id, behavior_subtype, behavior_entry_id, bank_behavior_id, active')
        .eq('active', true);

      // 3) bsd
      const { data: bsd } = await supabase
        .from('behavior_session_data')
        .select('student_id, session_id, behavior_id, frequency, duration_seconds');

      // 4) lba
      const { data: lba } = await supabase
        .from('nt_learner_behavior_assignments')
        .select('learner_id, behavior_id, status');

      // 5) student names
      const studentIds = new Set<string>([
        ...(sbm ?? []).map((r: any) => r.student_id),
        ...(bsd ?? []).map((r: any) => r.student_id),
      ]);
      const { data: students } = await supabase
        .from('students')
        .select('id, name, first_name, last_name')
        .in('id', Array.from(studentIds).filter(Boolean) as string[]);
      const nameMap = new Map<string, string>();
      (students ?? []).forEach((s: any) => {
        const composed =
          s.name ||
          [s.first_name, s.last_name].filter(Boolean).join(' ') ||
          maskUuid(s.id);
        nameMap.set(s.id, composed);
      });
      const nameOf = (id: string | null) =>
        (id && nameMap.get(id)) || maskUuid(id);

      // Unmapped
      const u: UnmappedRow[] = (sbm ?? [])
        .filter(
          (r: any) =>
            !r.bank_behavior_id || !canonIds.has(r.bank_behavior_id),
        )
        .map((r: any) => ({
          student_name: nameOf(r.student_id),
          behavior_subtype: r.behavior_subtype,
          behavior_entry_id: r.behavior_entry_id,
          bank_behavior_id: r.bank_behavior_id,
        }));

      // Orphans
      const orphanMap = new Map<string, OrphanRow>();
      (bsd ?? [])
        .filter((r: any) => !canonIds.has(r.behavior_id))
        .forEach((r: any) => {
          const key = `${r.student_id}|${r.session_id}|${r.behavior_id}`;
          const cur = orphanMap.get(key) ?? {
            student_name: nameOf(r.student_id),
            session_id: r.session_id,
            behavior_id: r.behavior_id,
            total_frequency: 0,
            total_duration: 0,
            row_count: 0,
          };
          cur.total_frequency += r.frequency ?? 0;
          cur.total_duration += r.duration_seconds ?? 0;
          cur.row_count += 1;
          orphanMap.set(key, cur);
        });

      // Missing canonical link
      const lbaPairs = new Set(
        (lba ?? [])
          .filter((r: any) => r.status === 'active')
          .map((r: any) => `${r.learner_id}|${r.behavior_id}`),
      );
      const m: MissingLinkRow[] = (sbm ?? [])
        .filter(
          (r: any) =>
            r.bank_behavior_id &&
            canonIds.has(r.bank_behavior_id) &&
            !lbaPairs.has(`${r.student_id}|${r.bank_behavior_id}`),
        )
        .map((r: any) => ({
          student_name: nameOf(r.student_id),
          behavior_subtype: r.behavior_subtype,
          bank_behavior_id: r.bank_behavior_id,
        }));

      setUnmapped(u);
      setOrphans(Array.from(orphanMap.values()));
      setMissing(m);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load integrity report');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    run();
  }, [run]);

  const applyOrphanMapping = async () => {
    if (!mappingOrphan) return;
    setApplyingMapping(true);
    try {
      if (mappingRule === 'delete') {
        const { error } = await supabase
          .from('behavior_session_data')
          .delete()
          .eq('behavior_id', mappingOrphan.behavior_id)
          .eq('session_id', mappingOrphan.session_id);
        if (error) throw error;
        toast.success(`Deleted ${mappingOrphan.row_count} orphan rows for ${mappingOrphan.student_name}`);
      } else {
        if (!mappingTarget) { toast.error('Select a canonical behavior first'); return; }
        const { error } = await supabase
          .from('behavior_session_data')
          .update({ behavior_id: mappingTarget })
          .eq('behavior_id', mappingOrphan.behavior_id)
          .eq('session_id', mappingOrphan.session_id);
        if (error) throw error;
        const label = canonicalBehaviors.find(b => b.id === mappingTarget)?.name ?? mappingTarget.slice(0, 8);
        toast.success(`Remapped orphan rows → ${label}`);
      }
      setMappingOrphan(null);
      setMappingTarget('');
      await run();
    } catch (e: any) {
      toast.error(e?.message ?? 'Mapping failed');
    } finally {
      setApplyingMapping(false);
    }
  };

  const allClean =
    !loading && unmapped.length === 0 && orphans.length === 0 && missing.length === 0;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Data Integrity Console
            </h1>
            <p className="text-sm text-muted-foreground">
              Surfaces unmapped behaviors, orphaned session rows, and missing
              canonical links.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="destructive" size="sm">
            <Link to="/restored-cleanup">
              <Trash2 className="w-4 h-4 mr-2" />
              Cleanup restored behaviors
            </Link>
          </Button>
          <Button onClick={run} disabled={loading} variant="outline" size="sm">
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      {allClean && (
        <Card className="border-emerald-500/50 bg-emerald-500/5">
          <CardContent className="p-6 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            <div>
              <div className="font-semibold text-foreground">All clean</div>
              <div className="text-sm text-muted-foreground">
                No unmapped behaviors, orphan rows, or missing canonical links
                found.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Section
        icon={<AlertTriangle className="w-4 h-4" />}
        title="Unmapped behaviors"
        subtitle="student_behavior_map entries not resolving to nt_behaviors"
        count={unmapped.length}
        loading={loading}
      >
        {unmapped.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4">Student</th>
                  <th className="py-2 pr-4">Label</th>
                  <th className="py-2 pr-4">Bank behavior</th>
                </tr>
              </thead>
              <tbody>
                {unmapped.map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="py-2 pr-4 text-foreground">{r.student_name}</td>
                    <td className="py-2 pr-4">{r.behavior_subtype ?? '—'}</td>
                    <td className="py-2 pr-4 font-mono text-xs">
                      {maskUuid(r.bank_behavior_id)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section
        icon={<Database className="w-4 h-4" />}
        title="Orphaned session rows"
        subtitle="behavior_session_data with non-canonical behavior_id"
        count={orphans.length}
        loading={loading}
      >
        {orphans.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4">Student</th>
                  <th className="py-2 pr-4">Session</th>
                  <th className="py-2 pr-4">Behavior</th>
                  <th className="py-2 pr-4 text-right">Freq</th>
                  <th className="py-2 pr-4 text-right">Dur (s)</th>
                  <th className="py-2 pr-4 text-right">Rows</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orphans.map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="py-2 pr-4 text-foreground">{r.student_name}</td>
                    <td className="py-2 pr-4 font-mono text-xs">
                      {maskUuid(r.session_id)}
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs">
                      {maskUuid(r.behavior_id)}
                    </td>
                    <td className="py-2 pr-4 text-right">{r.total_frequency}</td>
                    <td className="py-2 pr-4 text-right">{r.total_duration}</td>
                    <td className="py-2 pr-4 text-right">{r.row_count}</td>
                    <td className="py-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 gap-1 text-[10px]"
                        onClick={() => { setMappingOrphan(r); setMappingTarget(''); setMappingRule('remap'); }}
                      >
                        <Wand2 className="w-3 h-3" />
                        Map
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section
        icon={<Link2Off className="w-4 h-4" />}
        title="Missing canonical links"
        subtitle="Behaviors mapped but not assigned in nt_learner_behavior_assignments"
        count={missing.length}
        loading={loading}
      >
        {missing.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4">Student</th>
                  <th className="py-2 pr-4">Behavior</th>
                  <th className="py-2 pr-4">Canonical id</th>
                </tr>
              </thead>
              <tbody>
                {missing.map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="py-2 pr-4 text-foreground">{r.student_name}</td>
                    <td className="py-2 pr-4">{r.behavior_subtype ?? '—'}</td>
                    <td className="py-2 pr-4 font-mono text-xs">
                      {maskUuid(r.bank_behavior_id)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Orphan mapping wizard dialog */}
      <Dialog open={!!mappingOrphan} onOpenChange={(v) => { if (!v) { setMappingOrphan(null); setMappingTarget(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Wand2 className="w-4 h-4 text-primary" />
              Map Orphan Row
            </DialogTitle>
          </DialogHeader>

          {mappingOrphan && (
            <div className="space-y-4 text-sm">
              <div className="rounded-lg border bg-muted/40 p-3 space-y-1 text-xs">
                <div><span className="text-muted-foreground">Student:</span> {mappingOrphan.student_name}</div>
                <div><span className="text-muted-foreground">Session:</span> <span className="font-mono">{maskUuid(mappingOrphan.session_id)}</span></div>
                <div><span className="text-muted-foreground">Behavior:</span> <span className="font-mono">{maskUuid(mappingOrphan.behavior_id)}</span></div>
                <div><span className="text-muted-foreground">Rows:</span> {mappingOrphan.row_count} ({mappingOrphan.total_frequency} freq, {mappingOrphan.total_duration}s dur)</div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Action</Label>
                <Select value={mappingRule} onValueChange={(v) => setMappingRule(v as 'remap' | 'delete')}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="remap">Remap to canonical behavior</SelectItem>
                    <SelectItem value="delete">Delete orphan rows</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {mappingRule === 'remap' && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Target canonical behavior</Label>
                  <Select value={mappingTarget} onValueChange={setMappingTarget}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select behavior…" />
                    </SelectTrigger>
                    <SelectContent>
                      {canonicalBehaviors.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}{b.domain_name ? ` — ${b.domain_name}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {mappingRule === 'delete' && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                  This will permanently delete {mappingOrphan.row_count} row(s) from behavior_session_data. This cannot be undone.
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setMappingOrphan(null); setMappingTarget(''); }}
              disabled={applyingMapping}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant={mappingRule === 'delete' ? 'destructive' : 'default'}
              onClick={applyOrphanMapping}
              disabled={applyingMapping || (mappingRule === 'remap' && !mappingTarget)}
              className="gap-1"
            >
              {applyingMapping ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <Check className="w-3 h-3" />
              )}
              {mappingRule === 'delete' ? 'Delete rows' : 'Apply mapping'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Section({
  icon,
  title,
  subtitle,
  count,
  loading,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  count: number;
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            {icon}
            {title}
          </span>
          <Badge variant={count === 0 ? 'secondary' : 'destructive'}>
            {loading ? '…' : count}
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : count === 0 ? (
          <div className="text-sm text-muted-foreground">No issues found.</div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
