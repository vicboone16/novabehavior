import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Target, Plus, Edit2, Link2, TrendingUp, TrendingDown, Minus,
  CheckCircle, AlertTriangle, Clock, FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { GOAL_AREAS, MEASUREMENT_TYPES } from '@/types/staffProfile';
import type { IEPGoal, GoalLink } from '@/types/staffProfile';

interface IEPGoalsManagerProps {
  clientId: string;
}

export function IEPGoalsManager({ clientId }: IEPGoalsManagerProps) {
  const [goals, setGoals] = useState<IEPGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<IEPGoal | null>(null);
  
  const [formData, setFormData] = useState({
    goal_area: '',
    goal_text: '',
    short_description: '',
    baseline_summary: '',
    measurement_type: '',
    target_criteria: '',
    start_date: '',
    end_date: '',
    responsible_provider_role: '',
    status: 'active' as IEPGoal['status'],
  });

  useEffect(() => {
    loadGoals();
  }, [clientId]);

  const loadGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('iep_goals')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGoals(data as IEPGoal[] || []);
    } catch (error) {
      console.error('Error loading goals:', error);
      toast.error('Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.goal_area || !formData.goal_text || !formData.measurement_type) {
      toast.error('Please fill in required fields');
      return;
    }

    setSaving(true);
    try {
      if (selectedGoal) {
        const { error } = await supabase
          .from('iep_goals')
          .update({
            goal_area: formData.goal_area,
            goal_text: formData.goal_text,
            short_description: formData.short_description || null,
            baseline_summary: formData.baseline_summary || null,
            measurement_type: formData.measurement_type,
            target_criteria: formData.target_criteria || null,
            start_date: formData.start_date || null,
            end_date: formData.end_date || null,
            responsible_provider_role: formData.responsible_provider_role || null,
            status: formData.status,
          })
          .eq('id', selectedGoal.id);

        if (error) throw error;
        toast.success('Goal updated');
      } else {
        const { error } = await supabase.from('iep_goals').insert({
          client_id: clientId,
          goal_area: formData.goal_area,
          goal_text: formData.goal_text,
          short_description: formData.short_description || null,
          baseline_summary: formData.baseline_summary || null,
          measurement_type: formData.measurement_type,
          target_criteria: formData.target_criteria || null,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          responsible_provider_role: formData.responsible_provider_role || null,
          status: formData.status,
        });

        if (error) throw error;
        toast.success('Goal created');
      }

      setDialogOpen(false);
      resetForm();
      loadGoals();
    } catch (error) {
      console.error('Error saving goal:', error);
      toast.error('Failed to save goal');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedGoal(null);
    setFormData({
      goal_area: '',
      goal_text: '',
      short_description: '',
      baseline_summary: '',
      measurement_type: '',
      target_criteria: '',
      start_date: '',
      end_date: '',
      responsible_provider_role: '',
      status: 'active',
    });
  };

  const editGoal = (goal: IEPGoal) => {
    setSelectedGoal(goal);
    setFormData({
      goal_area: goal.goal_area,
      goal_text: goal.goal_text,
      short_description: goal.short_description || '',
      baseline_summary: goal.baseline_summary || '',
      measurement_type: goal.measurement_type,
      target_criteria: goal.target_criteria || '',
      start_date: goal.start_date || '',
      end_date: goal.end_date || '',
      responsible_provider_role: goal.responsible_provider_role || '',
      status: goal.status,
    });
    setDialogOpen(true);
  };

  const getStatusBadge = (status: IEPGoal['status']) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      mastered: 'secondary',
      modified: 'outline',
      discontinued: 'destructive',
      draft: 'outline',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const getDataStatusIcon = (status: IEPGoal['data_completeness_status']) => {
    switch (status) {
      case 'sufficient':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'insufficient':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const activeGoals = goals.filter(g => g.status === 'active');
  const masteredGoals = goals.filter(g => g.status === 'mastered');
  const otherGoals = goals.filter(g => !['active', 'mastered'].includes(g.status));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Target className="h-5 w-5" />
            IEP Goals
          </h3>
          <p className="text-sm text-muted-foreground">
            {activeGoals.length} active, {masteredGoals.length} mastered
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedGoal ? 'Edit Goal' : 'Add IEP Goal'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Goal Area *</Label>
                  <Select
                    value={formData.goal_area}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, goal_area: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select area" />
                    </SelectTrigger>
                    <SelectContent>
                      {GOAL_AREAS.map(area => (
                        <SelectItem key={area} value={area}>{area}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Measurement Type *</Label>
                  <Select
                    value={formData.measurement_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, measurement_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {MEASUREMENT_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Goal Text *</Label>
                <Textarea
                  value={formData.goal_text}
                  onChange={(e) => setFormData(prev => ({ ...prev, goal_text: e.target.value }))}
                  placeholder="Full goal statement..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Short Description</Label>
                <Input
                  value={formData.short_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, short_description: e.target.value }))}
                  placeholder="Brief description for reports"
                />
              </div>

              <div>
                <Label>Baseline Summary</Label>
                <Textarea
                  value={formData.baseline_summary}
                  onChange={(e) => setFormData(prev => ({ ...prev, baseline_summary: e.target.value }))}
                  placeholder="Current performance level..."
                  rows={2}
                />
              </div>

              <div>
                <Label>Target Criteria</Label>
                <Input
                  value={formData.target_criteria}
                  onChange={(e) => setFormData(prev => ({ ...prev, target_criteria: e.target.value }))}
                  placeholder="e.g., 80% accuracy over 3 consecutive sessions"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: IEPGoal['status']) => setFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="mastered">Mastered</SelectItem>
                      <SelectItem value="modified">Modified</SelectItem>
                      <SelectItem value="discontinued">Discontinued</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Responsible Provider Role</Label>
                <Select
                  value={formData.responsible_provider_role}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, responsible_provider_role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BCBA">BCBA</SelectItem>
                    <SelectItem value="RBT">RBT</SelectItem>
                    <SelectItem value="Teacher">Teacher</SelectItem>
                    <SelectItem value="SLP">SLP</SelectItem>
                    <SelectItem value="OT">OT</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={saving}>
                  {saving ? 'Saving...' : selectedGoal ? 'Update Goal' : 'Create Goal'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Goals List */}
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({activeGoals.length})</TabsTrigger>
          <TabsTrigger value="mastered">Mastered ({masteredGoals.length})</TabsTrigger>
          <TabsTrigger value="other">Other ({otherGoals.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4 mt-4">
          {activeGoals.length > 0 ? (
            activeGoals.map(goal => (
              <GoalCard key={goal.id} goal={goal} onEdit={editGoal} />
            ))
          ) : (
            <EmptyState message="No active goals" />
          )}
        </TabsContent>

        <TabsContent value="mastered" className="space-y-4 mt-4">
          {masteredGoals.length > 0 ? (
            masteredGoals.map(goal => (
              <GoalCard key={goal.id} goal={goal} onEdit={editGoal} />
            ))
          ) : (
            <EmptyState message="No mastered goals yet" />
          )}
        </TabsContent>

        <TabsContent value="other" className="space-y-4 mt-4">
          {otherGoals.length > 0 ? (
            otherGoals.map(goal => (
              <GoalCard key={goal.id} goal={goal} onEdit={editGoal} />
            ))
          ) : (
            <EmptyState message="No other goals" />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GoalCard({ goal, onEdit }: { goal: IEPGoal; onEdit: (goal: IEPGoal) => void }) {
  const measurementType = MEASUREMENT_TYPES.find(t => t.value === goal.measurement_type);

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">{goal.goal_area}</Badge>
              <Badge variant={goal.status === 'active' ? 'default' : 'secondary'}>
                {goal.status}
              </Badge>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                {goal.data_completeness_status === 'sufficient' ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                )}
                <span>{goal.data_completeness_status || 'pending'}</span>
              </div>
            </div>
            
            <p className="font-medium mb-2">{goal.short_description || goal.goal_text}</p>
            
            {goal.goal_text !== goal.short_description && goal.short_description && (
              <p className="text-sm text-muted-foreground mb-2">{goal.goal_text}</p>
            )}

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Measure: {measurementType?.label || goal.measurement_type}</span>
              {goal.target_criteria && (
                <span>Target: {goal.target_criteria}</span>
              )}
              {goal.responsible_provider_role && (
                <span>Provider: {goal.responsible_provider_role}</span>
              )}
            </div>

            {goal.narrative_summary && (
              <div className="mt-3 p-3 bg-muted rounded-lg">
                <p className="text-sm">{goal.narrative_summary}</p>
              </div>
            )}
          </div>

          <Button variant="ghost" size="icon" onClick={() => onEdit(goal)}>
            <Edit2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="py-8 text-center">
        <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}
