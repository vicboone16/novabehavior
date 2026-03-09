import { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Layers, StepForward, Loader2, FlaskConical, BarChart3 } from 'lucide-react';
import { useResearchGraphing } from '@/hooks/useResearchGraphing';

interface AdvancedResearchGraphingProps {
  studentId: string;
}

const SERIES_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--destructive))',
  'hsl(142 76% 36%)',
  'hsl(38 92% 50%)',
  'hsl(262 83% 58%)',
  'hsl(199 89% 48%)',
];

export function AdvancedResearchGraphing({ studentId }: AdvancedResearchGraphingProps) {
  const {
    groups, multipleBaselineSeries, changingCriterionSteps, loading,
    loadGroups, loadMultipleBaseline, loadChangingCriterion,
    createGroup, addSeries, addCriterionStep, deleteGroup,
  } = useResearchGraphing(studentId);

  const [tab, setTab] = useState<'multiple_baseline' | 'changing_criterion'>('multiple_baseline');
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newBaselineUnit, setNewBaselineUnit] = useState('sessions');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Add series dialog
  const [showAddSeries, setShowAddSeries] = useState(false);
  const [newSeriesLabel, setNewSeriesLabel] = useState('');
  const [newSeriesOrder, setNewSeriesOrder] = useState(1);
  const [newPhaseStartDate, setNewPhaseStartDate] = useState('');

  // Add criterion step dialog
  const [showAddStep, setShowAddStep] = useState(false);
  const [newStepValue, setNewStepValue] = useState(0);
  const [newStepOrder, setNewStepOrder] = useState(1);
  const [newStepLabel, setNewStepLabel] = useState('');
  const [newStepDate, setNewStepDate] = useState('');

  useEffect(() => { loadGroups(); }, [loadGroups]);

  useEffect(() => {
    if (selectedGroupId) {
      if (tab === 'multiple_baseline') loadMultipleBaseline(selectedGroupId);
      else loadChangingCriterion(selectedGroupId);
    }
  }, [selectedGroupId, tab, loadMultipleBaseline, loadChangingCriterion]);

  const filteredGroups = groups.filter(g => g.design_type === tab);

  const handleCreateGroup = async () => {
    if (!newGroupName) return;
    const result = await createGroup({
      group_name: newGroupName,
      design_type: tab,
      baseline_unit: tab === 'multiple_baseline' ? newBaselineUnit : undefined,
    });
    if (result) {
      setShowCreate(false);
      setNewGroupName('');
      setSelectedGroupId(result.id);
    }
  };

  const handleAddSeries = async () => {
    if (!selectedGroupId || !newSeriesLabel) return;
    await addSeries({
      group_id: selectedGroupId,
      series_label: newSeriesLabel,
      series_order: newSeriesOrder,
      phase_start_date: newPhaseStartDate || undefined,
    });
    setShowAddSeries(false);
    setNewSeriesLabel('');
    loadMultipleBaseline(selectedGroupId);
  };

  const handleAddStep = async () => {
    if (!selectedGroupId) return;
    await addCriterionStep({
      group_id: selectedGroupId,
      criterion_value: newStepValue,
      step_order: newStepOrder,
      phase_label: newStepLabel || undefined,
      phase_start_date: newStepDate || undefined,
    });
    setShowAddStep(false);
    loadChangingCriterion(selectedGroupId);
  };

  // Build changing criterion chart data
  const criterionChartData = useMemo(() => {
    return changingCriterionSteps.map((step, i) => ({
      x: step.phase_label || `Step ${step.step_order || i + 1}`,
      criterion: step.criterion_value,
      stepOrder: step.step_order || i + 1,
    }));
  }, [changingCriterionSteps]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-primary" />
            Advanced / Research Graphing
          </CardTitle>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowCreate(true)}>
            <Plus className="w-3 h-3" /> New Group
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={tab} onValueChange={v => { setTab(v as any); setSelectedGroupId(null); }}>
          <TabsList className="h-8 bg-muted/50">
            <TabsTrigger value="multiple_baseline" className="text-xs h-6 gap-1">
              <Layers className="w-3 h-3" /> Multiple Baseline
            </TabsTrigger>
            <TabsTrigger value="changing_criterion" className="text-xs h-6 gap-1">
              <StepForward className="w-3 h-3" /> Changing Criterion
            </TabsTrigger>
          </TabsList>

          {/* Group selector */}
          <div className="flex items-center gap-2 mt-3">
            <Label className="text-xs shrink-0">Group:</Label>
            <Select value={selectedGroupId || '_none'} onValueChange={v => setSelectedGroupId(v === '_none' ? null : v)}>
              <SelectTrigger className="h-7 text-xs flex-1">
                <SelectValue placeholder="Select a group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Select a group…</SelectItem>
                {filteredGroups.map(g => (
                  <SelectItem key={g.id} value={g.id}>{g.group_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedGroupId && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => {
                deleteGroup(selectedGroupId);
                setSelectedGroupId(null);
              }}>
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>

          <TabsContent value="multiple_baseline" className="mt-3 space-y-3">
            {!selectedGroupId ? (
              <EmptyGroupState message="Select or create a multiple baseline group" />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{multipleBaselineSeries.length} series in group</p>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowAddSeries(true)}>
                    <Plus className="w-3 h-3" /> Add Series
                  </Button>
                </div>
                {multipleBaselineSeries.length > 0 ? (
                  <div className="space-y-3">
                    {multipleBaselineSeries.map((s, i) => (
                      <div key={s.series_id} className="border border-border/50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: SERIES_COLORS[i % SERIES_COLORS.length] }} />
                          <span className="text-xs font-medium">{s.series_label}</span>
                          <Badge variant="outline" className="text-[10px]">Series {s.series_order || i + 1}</Badge>
                          {s.phase_start_date && (
                            <span className="text-[10px] text-muted-foreground">Intervention: {s.phase_start_date}</span>
                          )}
                        </div>
                        <div className="h-[120px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                              <XAxis fontSize={9} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                              <YAxis fontSize={9} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                              {s.phase_start_date && (
                                <ReferenceLine x={s.phase_start_date} stroke="hsl(var(--border))" strokeDasharray="6 3" strokeWidth={1.5} />
                              )}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyGroupState message="No series added yet. Add behaviors or skills to compare." />
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="changing_criterion" className="mt-3 space-y-3">
            {!selectedGroupId ? (
              <EmptyGroupState message="Select or create a changing criterion group" />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{changingCriterionSteps.length} criterion steps</p>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => {
                    setNewStepOrder(changingCriterionSteps.length + 1);
                    setShowAddStep(true);
                  }}>
                    <Plus className="w-3 h-3" /> Add Step
                  </Button>
                </div>

                {/* Steps list */}
                {changingCriterionSteps.length > 0 && (
                  <div className="space-y-1">
                    {changingCriterionSteps.map((step, i) => (
                      <div key={step.step_id} className="flex items-center gap-2 px-2 py-1.5 rounded border border-border/50 bg-card">
                        <Badge variant="secondary" className="text-[10px]">Step {step.step_order || i + 1}</Badge>
                        <span className="text-xs font-medium">Criterion: {step.criterion_value}</span>
                        {step.phase_label && <span className="text-[10px] text-muted-foreground">{step.phase_label}</span>}
                        {step.phase_start_date && <span className="text-[10px] text-muted-foreground ml-auto">{step.phase_start_date}</span>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Stair-step chart */}
                {criterionChartData.length > 0 && (
                  <div className="border border-border/50 rounded-lg p-3">
                    <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5 text-primary" />
                      Criterion Staircase
                    </p>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={criterionChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                        <XAxis dataKey="x" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip />
                        <Line
                          type="stepAfter"
                          dataKey="criterion"
                          stroke="hsl(var(--destructive))"
                          strokeWidth={2}
                          strokeDasharray="8 4"
                          dot={{ r: 4, fill: 'hsl(var(--destructive))' }}
                          name="Criterion"
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {changingCriterionSteps.length === 0 && (
                  <EmptyGroupState message="No criterion steps defined yet." />
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Create Group Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm">Create Research Graph Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Group Name</Label>
                <Input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="e.g. Aggression Across Settings" className="mt-1" />
              </div>
              {tab === 'multiple_baseline' && (
                <div>
                  <Label className="text-xs">Baseline Unit</Label>
                  <Select value={newBaselineUnit} onValueChange={setNewBaselineUnit}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sessions">Sessions</SelectItem>
                      <SelectItem value="days">Days</SelectItem>
                      <SelectItem value="weeks">Weeks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreateGroup} disabled={!newGroupName}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Series Dialog */}
        <Dialog open={showAddSeries} onOpenChange={setShowAddSeries}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm">Add Series</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Series Label</Label>
                <Input value={newSeriesLabel} onChange={e => setNewSeriesLabel(e.target.value)} placeholder="e.g. Classroom" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Order</Label>
                <Input type="number" value={newSeriesOrder} onChange={e => setNewSeriesOrder(Number(e.target.value))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Intervention Start Date (optional)</Label>
                <Input type="date" value={newPhaseStartDate} onChange={e => setNewPhaseStartDate(e.target.value)} className="mt-1" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={() => setShowAddSeries(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAddSeries} disabled={!newSeriesLabel}>Add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Criterion Step Dialog */}
        <Dialog open={showAddStep} onOpenChange={setShowAddStep}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm">Add Criterion Step</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Criterion Value</Label>
                <Input type="number" value={newStepValue} onChange={e => setNewStepValue(Number(e.target.value))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Step Order</Label>
                <Input type="number" value={newStepOrder} onChange={e => setNewStepOrder(Number(e.target.value))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Phase Label (optional)</Label>
                <Input value={newStepLabel} onChange={e => setNewStepLabel(e.target.value)} placeholder="e.g. Phase 2" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Phase Start Date (optional)</Label>
                <Input type="date" value={newStepDate} onChange={e => setNewStepDate(e.target.value)} className="mt-1" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={() => setShowAddStep(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAddStep}>Add Step</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function EmptyGroupState({ message }: { message: string }) {
  return (
    <div className="text-center py-8 text-muted-foreground">
      <FlaskConical className="w-6 h-6 mx-auto mb-2 opacity-40" />
      <p className="text-xs">{message}</p>
    </div>
  );
}
