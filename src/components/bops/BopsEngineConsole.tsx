import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Loader2, Search, RefreshCw, Eye, Play, Zap, BarChart3 } from 'lucide-react';
import {
  useBopsEngineRoster, useToggleBops, useRunCfi, useGenerateRecommendations,
  useAcceptAndActivate, useStudentBopsDashboard, useStudentSuggestedPrograms,
  useStudentAcceptedPrograms,
} from '@/hooks/useBopsEngine';
import { useNavigate } from 'react-router-dom';

const statusColors: Record<string, string> = {
  not_started: 'bg-muted text-muted-foreground',
  in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  profile_saved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  scored: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
};

const fitBandColors: Record<string, string> = {
  high: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  moderate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  low: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const dayStateColors: Record<string, string> = {
  red: 'bg-red-500 text-white',
  yellow: 'bg-yellow-400 text-black',
  green: 'bg-green-500 text-white',
};

function DayStateBadge({ state }: { state?: string | null }) {
  if (!state) return <span className="text-muted-foreground text-xs">—</span>;
  return <Badge className={`${dayStateColors[state] || 'bg-muted'} text-xs`}>{state}</Badge>;
}

export function BopsEngineConsole() {
  const { data: roster, isLoading, refetch } = useBopsEngineRoster();
  const toggleBops = useToggleBops();
  const runCfi = useRunCfi();
  const genRecs = useGenerateRecommendations();
  const acceptActivate = useAcceptAndActivate();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [filterEnabled, setFilterEnabled] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerStudentId, setDrawerStudentId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!roster) return [];
    return roster.filter(r => {
      if (search && !(r.student_name || '').toLowerCase().includes(search.toLowerCase())) return false;
      if (filterEnabled === 'yes' && !r.bops_enabled) return false;
      if (filterEnabled === 'no' && r.bops_enabled) return false;
      if (filterStatus !== 'all' && r.bops_assessment_status !== filterStatus) return false;
      return true;
    });
  }, [roster, search, filterEnabled, filterStatus]);

  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(r => r.student_id)));
  };

  const bulkToggle = async (enable: boolean) => {
    for (const id of selected) {
      await toggleBops.mutateAsync({ studentId: id, enable });
    }
    setSelected(new Set());
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">BOPS Engine Console</h2>
        <p className="text-sm text-muted-foreground">Behavioral Operating Profile System — assessment, classification, and daily planning</p>
      </div>
      {/* Toolbar */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterEnabled} onValueChange={setFilterEnabled}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="BOPS Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="yes">Enabled</SelectItem>
                <SelectItem value="no">Disabled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Assessment" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="profile_saved">Profile Saved</SelectItem>
                <SelectItem value="scored">Scored</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
            {selected.size > 0 && (
              <>
                <Button size="sm" onClick={() => bulkToggle(true)} disabled={toggleBops.isPending}>
                  Enable ({selected.size})
                </Button>
                <Button size="sm" variant="outline" onClick={() => bulkToggle(false)} disabled={toggleBops.isPending}>
                  Disable ({selected.size})
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin w-6 h-6" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox checked={filtered.length > 0 && selected.size === filtered.length} onCheckedChange={toggleAll} />
                    </TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>BOPS</TableHead>
                    <TableHead>Assessment</TableHead>
                    <TableHead>Scored</TableHead>
                    <TableHead>Profile</TableHead>
                    <TableHead>Best Fit</TableHead>
                    <TableHead>Fit</TableHead>
                    <TableHead>Programs</TableHead>
                    <TableHead>Nova</TableHead>
                    <TableHead>Beacon</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">No students found</TableCell></TableRow>
                  ) : filtered.map(r => (
                    <TableRow key={r.student_id} className="group">
                      <TableCell>
                        <Checkbox checked={selected.has(r.student_id)} onCheckedChange={() => toggleSelect(r.student_id)} />
                      </TableCell>
                      <TableCell>
                        <button onClick={() => navigate(`/students/${r.student_id}`)} className="text-sm font-medium text-primary hover:underline">
                          {r.student_name || 'Unknown'}
                        </button>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={!!r.bops_enabled}
                          disabled={toggleBops.isPending}
                          onCheckedChange={c => toggleBops.mutate({ studentId: r.student_id, enable: c })}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${statusColors[r.bops_assessment_status] || 'bg-muted'}`}>
                          {(r.bops_assessment_status || 'not_started').replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.assessment_date || '—'}</TableCell>
                      <TableCell className="text-xs max-w-[120px] truncate" title={r.calculated_training_name || ''}>
                        {r.calculated_training_name || <span className="text-muted-foreground">Not scored</span>}
                      </TableCell>
                      <TableCell className="text-xs max-w-[100px] truncate" title={r.best_fit_model_name || ''}>
                        {r.best_fit_model_name || '—'}
                      </TableCell>
                      <TableCell>
                        {r.best_fit_band ? (
                          <Badge className={`text-xs ${fitBandColors[r.best_fit_band] || 'bg-muted'}`}>{r.best_fit_band}</Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.bops_programming_active ? 'default' : 'secondary'} className="text-xs">
                          {r.bops_programming_active ? 'Active' : 'Off'}
                        </Badge>
                      </TableCell>
                      <TableCell><DayStateBadge state={r.nova_day_state} /></TableCell>
                      <TableCell><DayStateBadge state={r.beacon_day_state} /></TableCell>
                      <TableCell>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {r.latest_scored_session_id && (
                            <>
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Run CFI"
                                disabled={runCfi.isPending}
                                onClick={() => runCfi.mutate({ studentId: r.student_id, sessionId: r.latest_scored_session_id })}>
                                <BarChart3 className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Generate Recommendations"
                                disabled={genRecs.isPending}
                                onClick={() => genRecs.mutate({ studentId: r.student_id, sessionId: r.latest_scored_session_id })}>
                                <Zap className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Accept + Activate"
                                disabled={acceptActivate.isPending}
                                onClick={() => acceptActivate.mutate({ studentId: r.student_id, sessionId: r.latest_scored_session_id })}>
                                <Play className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="View Dashboard"
                            onClick={() => setDrawerStudentId(r.student_id)}>
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Drawer */}
      <BopsDetailDrawer studentId={drawerStudentId} onClose={() => setDrawerStudentId(null)} />
    </div>
  );
}

function BopsDetailDrawer({ studentId, onClose }: { studentId: string | null; onClose: () => void }) {
  const { data, isLoading } = useStudentBopsDashboard(studentId || undefined);
  const { data: suggested } = useStudentSuggestedPrograms(studentId || undefined);
  const { data: accepted } = useStudentAcceptedPrograms(studentId || undefined);

  return (
    <Sheet open={!!studentId} onOpenChange={o => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base">BOPS Intelligence Summary</SheetTitle>
        </SheetHeader>
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
        ) : !data ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No BOPS data available</p>
        ) : (
          <div className="space-y-4 mt-4">
            <Section title="Profile">
              <KV label="Training Name" value={data.calculated_training_name} />
              <KV label="Clinical Name" value={data.calculated_clinical_name} />
              <KV label="Type" value={data.calculated_profile_type} />
              <KV label="Primary" value={data.primary_archetype} />
              <KV label="Secondary" value={data.secondary_archetype} />
              <KV label="Tertiary" value={data.tertiary_archetype} />
            </Section>

            <Section title="Clinical Indices">
              <div className="grid grid-cols-2 gap-2">
                <IndexChip label="Storm" value={data.storm_score} />
                <IndexChip label="Escalation" value={data.escalation_index} />
                <IndexChip label="Hidden Need" value={data.hidden_need_index} />
                <IndexChip label="Sensory Load" value={data.sensory_load_index} />
                <IndexChip label="Power Conflict" value={data.power_conflict_index} />
                <IndexChip label="Social" value={data.social_complexity_index} />
                <IndexChip label="Recovery" value={data.recovery_burden_index} />
              </div>
            </Section>

            <Section title="Placement">
              <KV label="Best Fit" value={data.best_fit_model_name} />
              <KV label="Score" value={data.best_fit_score} />
              <KV label="Band" value={data.best_fit_band} />
            </Section>

            <Section title="Programs">
              <KV label="Suggested" value={suggested?.length ?? data.total_suggested_programs} />
              <KV label="Accepted" value={accepted?.length ?? data.accepted_programs_total} />
              <KV label="Active" value={data.accepted_programs_active} />
              <div className="flex gap-2 mt-1">
                <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 text-xs">Red: {data.red_programs || 0}</Badge>
                <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 text-xs">Yellow: {data.yellow_programs || 0}</Badge>
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs">Green: {data.green_programs || 0}</Badge>
              </div>
            </Section>

            <Section title="Day States">
              <KV label="Nova" value={data.current_day_state} />
              <KV label="Beacon" value={data.beacon_day_state} />
            </Section>

            {data.latest_mtss_tier && (
              <Section title="MTSS">
                <KV label="Tier" value={data.latest_mtss_tier} />
                <KV label="Status" value={data.latest_mtss_status} />
                <KV label="Goal" value={data.latest_mtss_primary_goal} />
              </Section>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{title}</h4>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value ?? '—'}</span>
    </div>
  );
}

function IndexChip({ label, value }: { label: string; value: any }) {
  const n = typeof value === 'number' ? value : parseFloat(value);
  const color = isNaN(n) ? 'bg-muted' : n >= 0.7 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : n >= 0.4 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
  return (
    <div className={`rounded px-2 py-1 text-xs ${color}`}>
      <span className="font-medium">{label}:</span> {isNaN(n) ? '—' : n.toFixed(2)}
    </div>
  );
}
