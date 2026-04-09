import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Plus, Search, Loader2, Clock, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface IncidentLog {
  id: string;
  agency_id: string;
  client_id: string | null;
  logged_by: string;
  incident_type: string;
  severity: number;
  title: string;
  description: string | null;
  location: string | null;
  witnesses: string[] | null;
  actions_taken: string | null;
  follow_up_required: boolean | null;
  follow_up_notes: string | null;
  occurred_at: string;
  created_at: string;
}

const INCIDENT_TYPES = [
  'behavioral_crisis', 'physical_aggression', 'self_injury', 'elopement',
  'property_destruction', 'verbal_threat', 'medical', 'safety_violation', 'other',
];

const SEVERITY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Minor', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  2: { label: 'Low', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  3: { label: 'Moderate', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
  4: { label: 'High', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
  5: { label: 'Critical', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
};

export default function IncidentLogs() {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<IncidentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');

  // Lookups
  const [agencies, setAgencies] = useState<{ id: string; name: string }[]>([]);
  const [students, setStudents] = useState<{ id: string; name: string; display_name: string | null }[]>([]);

  // Form
  const [form, setForm] = useState({
    agency_id: '',
    client_id: '',
    incident_type: 'behavioral_crisis',
    severity: 3,
    title: '',
    description: '',
    location: '',
    witnesses: '',
    actions_taken: '',
    follow_up_required: false,
    follow_up_notes: '',
    occurred_at: new Date().toISOString().slice(0, 16),
  });

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('incident_logs')
        .select('*')
        .order('occurred_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setIncidents((data as IncidentLog[]) || []);
    } catch (err: any) {
      console.error('Error fetching incidents:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLookups = useCallback(async () => {
    const [agRes, stRes] = await Promise.all([
      supabase.from('agencies').select('id, name').eq('status', 'active').limit(200),
      supabase.from('students').select('id, name, display_name').limit(500),
    ]);
    setAgencies(agRes.data || []);
    setStudents(stRes.data || []);
    // Auto-select first agency
    if (agRes.data && agRes.data.length > 0) {
      setForm(f => ({ ...f, agency_id: f.agency_id || agRes.data![0].id }));
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
    fetchLookups();
  }, [fetchIncidents, fetchLookups]);

  const handleCreate = async () => {
    if (!form.title || !form.agency_id || !user) return;
    setSaving(true);
    try {
      const payload: any = {
        agency_id: form.agency_id,
        client_id: form.client_id || null,
        logged_by: user.id,
        incident_type: form.incident_type,
        severity: form.severity,
        title: form.title,
        description: form.description || null,
        location: form.location || null,
        witnesses: form.witnesses ? form.witnesses.split(',').map(w => w.trim()).filter(Boolean) : null,
        actions_taken: form.actions_taken || null,
        follow_up_required: form.follow_up_required,
        follow_up_notes: form.follow_up_notes || null,
        occurred_at: new Date(form.occurred_at).toISOString(),
      };
      const { error } = await supabase.from('incident_logs').insert(payload);
      if (error) throw error;
      toast.success('Incident logged' + (form.severity >= 3 ? ' — CI signal auto-generated' : ''));
      setModalOpen(false);
      resetForm();
      fetchIncidents();
    } catch (err: any) {
      toast.error('Failed to log incident: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => setForm({
    agency_id: agencies[0]?.id || '',
    client_id: '',
    incident_type: 'behavioral_crisis',
    severity: 3,
    title: '',
    description: '',
    location: '',
    witnesses: '',
    actions_taken: '',
    follow_up_required: false,
    follow_up_notes: '',
    occurred_at: new Date().toISOString().slice(0, 16),
  });

  const filtered = useMemo(() => {
    let list = incidents;
    if (search) {
      const t = search.toLowerCase();
      list = list.filter(i => i.title.toLowerCase().includes(t) || (i.description || '').toLowerCase().includes(t));
    }
    if (filterType !== 'all') list = list.filter(i => i.incident_type === filterType);
    if (filterSeverity !== 'all') list = list.filter(i => i.severity === Number(filterSeverity));
    return list;
  }, [incidents, search, filterType, filterSeverity]);

  const stats = useMemo(() => ({
    total: incidents.length,
    critical: incidents.filter(i => i.severity >= 4).length,
    followUp: incidents.filter(i => i.follow_up_required).length,
  }), [incidents]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            Incident Logs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Record and track incidents. Severity ≥ 3 auto-generates CI signals.
          </p>
        </div>
        <Button onClick={() => { resetForm(); setModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Log Incident
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Incidents</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">{stats.critical}</p>
            <p className="text-xs text-muted-foreground">High / Critical</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.followUp}</p>
            <p className="text-xs text-muted-foreground">Follow-Up Required</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search incidents..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {INCIDENT_TYPES.map(t => (
              <SelectItem key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="All Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            {[1, 2, 3, 4, 5].map(s => (
              <SelectItem key={s} value={String(s)}>{SEVERITY_LABELS[s].label} ({s})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="font-medium">No incidents found</p>
            <p className="text-sm text-muted-foreground mt-1">Click "Log Incident" to record a new one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Occurred</TableHead>
                <TableHead>Follow-Up</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(i => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">{i.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {i.incident_type.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${SEVERITY_LABELS[i.severity]?.color} text-xs`}>
                      {SEVERITY_LABELS[i.severity]?.label || i.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {i.location ? (
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{i.location}</span>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(i.occurred_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </TableCell>
                  <TableCell>
                    {i.follow_up_required ? (
                      <Badge variant="outline" className="text-yellow-600 border-yellow-400">Required</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={modalOpen} onOpenChange={v => !v && setModalOpen(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log New Incident</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Brief incident title" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Agency</Label>
                <Select value={form.agency_id} onValueChange={v => setForm(f => ({ ...f, agency_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select agency" /></SelectTrigger>
                  <SelectContent>
                    {agencies.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Student (optional)</Label>
                <Select value={form.client_id || "__none__"} onValueChange={v => setForm(f => ({ ...f, client_id: v === "__none__" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {students.map(s => <SelectItem key={s.id} value={s.id}>{s.display_name || s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Incident Type</Label>
                <Select value={form.incident_type} onValueChange={v => setForm(f => ({ ...f, incident_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INCIDENT_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Severity (1-5)</Label>
                <Select value={String(form.severity)} onValueChange={v => setForm(f => ({ ...f, severity: Number(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map(s => (
                      <SelectItem key={s} value={String(s)}>{s} — {SEVERITY_LABELS[s].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.severity >= 3 && (
                  <p className="text-xs text-yellow-600 mt-1">⚡ Auto-generates CI signal</p>
                )}
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Describe what happened..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Location</Label>
                <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Classroom 3B" />
              </div>
              <div>
                <Label>When</Label>
                <Input type="datetime-local" value={form.occurred_at} onChange={e => setForm(f => ({ ...f, occurred_at: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Witnesses (comma-separated)</Label>
              <Input value={form.witnesses} onChange={e => setForm(f => ({ ...f, witnesses: e.target.value }))} placeholder="Jane Doe, John Smith" />
            </div>
            <div>
              <Label>Actions Taken</Label>
              <Textarea value={form.actions_taken} onChange={e => setForm(f => ({ ...f, actions_taken: e.target.value }))} rows={2} placeholder="What was done in response?" />
            </div>
            <div className="flex items-center justify-between">
              <Label>Follow-Up Required</Label>
              <Switch checked={form.follow_up_required} onCheckedChange={v => setForm(f => ({ ...f, follow_up_required: v }))} />
            </div>
            {form.follow_up_required && (
              <div>
                <Label>Follow-Up Notes</Label>
                <Textarea value={form.follow_up_notes} onChange={e => setForm(f => ({ ...f, follow_up_notes: e.target.value }))} rows={2} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !form.title || !form.agency_id}>
              {saving ? 'Saving...' : 'Log Incident'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
