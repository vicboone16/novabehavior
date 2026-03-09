import { useState, useEffect, useMemo } from 'react';
import {
  Search, Shield, Target, Heart, BookOpen, BarChart3, FileText,
  Table2, Type, ChevronDown, ChevronUp, GripVertical, CheckCircle2,
  Loader2, AlertCircle, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useReportGoalInclusions, type ReportGoalInclusion } from '@/hooks/useReportGoalInclusions';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

const db = supabase as any;

const REPORT_TYPES = [
  { value: 'fba', label: 'Functional Behavior Assessment' },
  { value: 'reassessment', label: 'Reassessment' },
  { value: 'progress_report', label: 'Progress Report' },
  { value: 'clinical_review', label: 'Clinical Review' },
  { value: 'parent_training_summary', label: 'Parent Training Summary' },
];

const DOMAIN_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  behavior: { label: 'Behavior / Intervention', icon: Shield, color: 'text-destructive' },
  skill: { label: 'Skill Acquisition', icon: Target, color: 'text-primary' },
  caregiver: { label: 'Parent / Caregiver Training', icon: Heart, color: 'text-emerald-500' },
};

const STATUS_COLORS: Record<string, string> = {
  mastered: 'text-emerald-600 border-emerald-300',
  in_progress: 'text-blue-600 border-blue-300',
  not_started: 'text-muted-foreground border-border',
  maintenance: 'text-amber-600 border-amber-300',
};

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export function ReportGoalInclusionManager() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'setup' | 'select' | 'preview'>('setup');
  const [reportType, setReportType] = useState('progress_report');
  const [clientId, setClientId] = useState('');
  const [clients, setClients] = useState<Array<{ client_id: string; first_name: string; last_name: string }>>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);

  const {
    inclusions, inclusionsByDomain, selectedCount, loading,
    initialize, updateInclusion, loadSelectedInclusions,
  } = useReportGoalInclusions(reportId);

  // Load clients on open
  useEffect(() => {
    if (open) {
      setLoadingClients(true);
      db.from('clients').select('client_id, first_name, last_name').eq('status', 'active').order('last_name')
        .then(({ data }: any) => { setClients(data || []); setLoadingClients(false); });
    }
  }, [open]);

  const handleStart = async () => {
    if (!clientId) return;
    const rptId = uuidv4();
    setReportId(rptId);
    await initialize(rptId, clientId);
    setStep('select');
  };

  const handleReset = () => {
    setStep('setup');
    setReportId(null);
    setClientId('');
  };

  const selectedClient = clients.find(c => c.client_id === clientId);

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-1.5">
        <BookOpen className="w-4 h-4" />
        Goal Inclusion Report
      </Button>

      <Dialog open={open} onOpenChange={v => { if (!v) { setOpen(false); handleReset(); } }}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Report Goal & Data Selector
            </DialogTitle>
            <DialogDescription>
              {step === 'setup' && 'Choose a report type and client to load available goals and data.'}
              {step === 'select' && `Select goals and data to include for ${selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name}` : 'client'}`}
              {step === 'preview' && `Preview selected items (${selectedCount} included)`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0">
            {step === 'setup' && (
              <SetupStep
                reportType={reportType}
                setReportType={setReportType}
                clientId={clientId}
                setClientId={setClientId}
                clients={clients}
                loadingClients={loadingClients}
              />
            )}

            {step === 'select' && (
              <SelectionStep
                inclusions={inclusions}
                inclusionsByDomain={inclusionsByDomain}
                loading={loading}
                onUpdate={updateInclusion}
                selectedCount={selectedCount}
              />
            )}

            {step === 'preview' && (
              <PreviewStep
                inclusions={inclusions.filter(i => i.include_in_report)}
                reportType={reportType}
                clientName={selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name}` : ''}
              />
            )}
          </div>

          <DialogFooter className="border-t border-border pt-3">
            {step === 'setup' && (
              <Button onClick={handleStart} disabled={!clientId || loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Load Available Goals
              </Button>
            )}
            {step === 'select' && (
              <div className="flex items-center justify-between w-full">
                <Button variant="ghost" size="sm" onClick={handleReset}>← Back</Button>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{selectedCount} items selected</span>
                  <Button onClick={() => setStep('preview')} disabled={selectedCount === 0}>
                    Preview Report Items
                  </Button>
                </div>
              </div>
            )}
            {step === 'preview' && (
              <div className="flex items-center justify-between w-full">
                <Button variant="ghost" size="sm" onClick={() => setStep('select')}>← Back to Selection</Button>
                <Button onClick={() => { toast.success('Report items saved'); setOpen(false); handleReset(); }}>
                  Confirm & Close
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 1: Setup                                                      */
/* ------------------------------------------------------------------ */
function SetupStep({
  reportType, setReportType, clientId, setClientId, clients, loadingClients,
}: {
  reportType: string; setReportType: (v: string) => void;
  clientId: string; setClientId: (v: string) => void;
  clients: Array<{ client_id: string; first_name: string; last_name: string }>;
  loadingClients: boolean;
}) {
  return (
    <div className="space-y-5 py-4">
      <div>
        <Label className="text-sm font-medium">Report Type</Label>
        <Select value={reportType} onValueChange={setReportType}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            {REPORT_TYPES.map(rt => (
              <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-sm font-medium">Client / Student</Label>
        <Select value={clientId || '_none'} onValueChange={v => setClientId(v === '_none' ? '' : v)}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder={loadingClients ? 'Loading clients…' : 'Select a client'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">Select a client…</SelectItem>
            {clients.map(c => (
              <SelectItem key={c.client_id} value={c.client_id}>
                {c.last_name}, {c.first_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-muted/30">
        <CardContent className="py-3">
          <p className="text-xs text-muted-foreground">
            After selecting a client, the system will load all available skill goals, behavior goals, and caregiver goals.
            You can then choose which items to include in the report along with summary text, data tables, and graphs.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 2: Selection                                                  */
/* ------------------------------------------------------------------ */
function SelectionStep({
  inclusions, inclusionsByDomain, loading, onUpdate, selectedCount,
}: {
  inclusions: ReportGoalInclusion[];
  inclusionsByDomain: Record<string, ReportGoalInclusion[]>;
  loading: boolean;
  onUpdate: (id: string, u: any) => void;
  selectedCount: number;
}) {
  const [search, setSearch] = useState('');
  const [domainTab, setDomainTab] = useState('all');

  const domains = Object.keys(inclusionsByDomain).sort();
  const displayDomains = domainTab === 'all' ? domains : [domainTab];

  const filteredByDomain = useMemo(() => {
    const result: Record<string, ReportGoalInclusion[]> = {};
    for (const d of displayDomains) {
      const items = inclusionsByDomain[d] || [];
      const filtered = search
        ? items.filter(i => i.item_title?.toLowerCase().includes(search.toLowerCase()))
        : items;
      if (filtered.length > 0) result[d] = filtered;
    }
    return result;
  }, [inclusionsByDomain, displayDomains, search]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (inclusions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No reportable goals found for this client</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search goals…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Tabs value={domainTab} onValueChange={setDomainTab}>
          <TabsList className="h-9 bg-muted/50">
            <TabsTrigger value="all" className="text-xs h-7">All</TabsTrigger>
            {domains.map(d => {
              const cfg = DOMAIN_CONFIG[d];
              return (
                <TabsTrigger key={d} value={d} className="text-xs h-7 gap-1">
                  {cfg ? <cfg.icon className={`w-3 h-3 ${cfg.color}`} /> : null}
                  {cfg?.label || d}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      <p className="text-xs text-muted-foreground">
        {inclusions.length} items available • {selectedCount} selected for report
      </p>

      {/* Domain sections */}
      {Object.entries(filteredByDomain).map(([domain, items]) => {
        const cfg = DOMAIN_CONFIG[domain] || { label: domain, icon: FileText, color: 'text-muted-foreground' };
        return (
          <DomainSection
            key={domain}
            domain={domain}
            label={cfg.label}
            icon={cfg.icon}
            color={cfg.color}
            items={items}
            onUpdate={onUpdate}
          />
        );
      })}
    </div>
  );
}

function DomainSection({
  domain, label, icon: Icon, color, items, onUpdate,
}: {
  domain: string; label: string; icon: any; color: string;
  items: ReportGoalInclusion[];
  onUpdate: (id: string, u: any) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const selectedInDomain = items.filter(i => i.include_in_report).length;

  return (
    <Card>
      <CardHeader
        className="py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Icon className={`w-4 h-4 ${color}`} />
            {label}
            <Badge variant="secondary" className="text-[10px] ml-1">{items.length}</Badge>
            {selectedInDomain > 0 && (
              <Badge className="text-[10px] ml-1 bg-primary/90">{selectedInDomain} selected</Badge>
            )}
          </CardTitle>
          {collapsed ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
        </div>
      </CardHeader>
      {!collapsed && (
        <CardContent className="pt-0 pb-3 px-4">
          <div className="space-y-1">
            {/* Header */}
            <div className="grid grid-cols-[1fr_60px_60px_60px_60px] gap-1 text-[10px] text-muted-foreground font-medium px-2 pb-1 border-b border-border/50">
              <span>Goal / Item</span>
              <span className="text-center">Include</span>
              <span className="text-center">Summary</span>
              <span className="text-center">Table</span>
              <span className="text-center">Graph</span>
            </div>
            {items.map(inc => (
              <InclusionRow key={inc.id} inclusion={inc} onUpdate={onUpdate} />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function InclusionRow({ inclusion, onUpdate }: { inclusion: ReportGoalInclusion; onUpdate: (id: string, u: any) => void }) {
  return (
    <div className={`grid grid-cols-[1fr_60px_60px_60px_60px] gap-1 items-center px-2 py-1.5 rounded hover:bg-muted/30 transition-colors ${
      inclusion.include_in_report ? 'bg-primary/5' : ''
    }`}>
      <div className="min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{inclusion.item_title || 'Untitled'}</p>
        <p className="text-[10px] text-muted-foreground">{inclusion.source_object_type?.replace('_', ' ')}</p>
      </div>
      <div className="flex justify-center">
        <Checkbox
          checked={inclusion.include_in_report}
          onCheckedChange={v => onUpdate(inclusion.id, { include_in_report: !!v })}
        />
      </div>
      <div className="flex justify-center">
        <Checkbox
          checked={inclusion.include_summary}
          disabled={!inclusion.include_in_report}
          onCheckedChange={v => onUpdate(inclusion.id, { include_summary: !!v })}
        />
      </div>
      <div className="flex justify-center">
        <Checkbox
          checked={inclusion.include_table}
          disabled={!inclusion.include_in_report}
          onCheckedChange={v => onUpdate(inclusion.id, { include_table: !!v })}
        />
      </div>
      <div className="flex justify-center">
        <Checkbox
          checked={inclusion.include_graph}
          disabled={!inclusion.include_in_report}
          onCheckedChange={v => onUpdate(inclusion.id, { include_graph: !!v })}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 3: Preview                                                    */
/* ------------------------------------------------------------------ */
function PreviewStep({
  inclusions, reportType, clientName,
}: {
  inclusions: ReportGoalInclusion[];
  reportType: string;
  clientName: string;
}) {
  const rtLabel = REPORT_TYPES.find(r => r.value === reportType)?.label || reportType;

  // Group by domain
  const grouped = inclusions.reduce<Record<string, ReportGoalInclusion[]>>((acc, inc) => {
    const d = inc.domain || 'other';
    if (!acc[d]) acc[d] = [];
    acc[d].push(inc);
    return acc;
  }, {});

  return (
    <div className="space-y-4 py-2">
      <Card className="bg-muted/30">
        <CardContent className="py-3">
          <div className="flex items-center gap-3 text-sm">
            <FileText className="w-4 h-4 text-primary" />
            <div>
              <p className="font-medium text-foreground">{rtLabel}</p>
              <p className="text-xs text-muted-foreground">
                {clientName} • {inclusions.length} item{inclusions.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {Object.entries(grouped).map(([domain, items]) => {
        const cfg = DOMAIN_CONFIG[domain] || { label: domain, icon: FileText, color: 'text-muted-foreground' };
        return (
          <div key={domain}>
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-2">
              <cfg.icon className={`w-3.5 h-3.5 ${cfg.color}`} />
              {cfg.label}
            </h4>
            <div className="space-y-1.5">
              {items.map((inc, i) => (
                <div key={inc.id} className="flex items-center gap-3 p-2.5 rounded border border-border/50 bg-card">
                  <span className="text-[10px] text-muted-foreground w-5 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{inc.item_title}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {inc.include_summary && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger><Type className="w-3 h-3 text-muted-foreground" /></TooltipTrigger>
                          <TooltipContent><p className="text-xs">Summary included</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {inc.include_table && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger><Table2 className="w-3 h-3 text-muted-foreground" /></TooltipTrigger>
                          <TooltipContent><p className="text-xs">Data table included</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {inc.include_graph && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger><BarChart3 className="w-3 h-3 text-muted-foreground" /></TooltipTrigger>
                          <TooltipContent><p className="text-xs">Graph included</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {inclusions.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No items selected for this report
        </div>
      )}
    </div>
  );
}
