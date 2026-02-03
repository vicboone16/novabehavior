import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Plus, Trash2, Save, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { ClientSchedulingPreferences, AvailabilityWindow, HardConstraint } from '@/types/clientProfile';

interface SchedulingTabProps {
  clientId: string;
  data: ClientSchedulingPreferences | null;
  onRefresh: () => void;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun'
};

const LOCATION_TYPES = [
  { value: 'home', label: 'Home' },
  { value: 'school', label: 'School' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'community', label: 'Community' },
  { value: 'any', label: 'Any Location' },
];

const CADENCE_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: '3x_week', label: '3x per Week' },
  { value: '2x_week', label: '2x per Week' },
  { value: 'weekly', label: 'Weekly' },
];

export function SchedulingTab({ clientId, data, onRefresh }: SchedulingTabProps) {
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    availability_windows: data?.availability_windows || [],
    hard_constraints: data?.hard_constraints || [],
    preferred_session_length: data?.preferred_session_length || null,
    preferred_cadence: data?.preferred_cadence || null,
    max_sessions_per_day: data?.max_sessions_per_day || 1,
    min_gap_between_sessions: data?.min_gap_between_sessions || null,
    school_schedule: data?.school_schedule || {},
    vacation_blackouts: data?.vacation_blackouts || [],
    notes: data?.notes || '',
  });

  useEffect(() => {
    if (data) {
      setFormData({
        availability_windows: data.availability_windows || [],
        hard_constraints: data.hard_constraints || [],
        preferred_session_length: data.preferred_session_length,
        preferred_cadence: data.preferred_cadence,
        max_sessions_per_day: data.max_sessions_per_day || 1,
        min_gap_between_sessions: data.min_gap_between_sessions,
        school_schedule: data.school_schedule || {},
        vacation_blackouts: data.vacation_blackouts || [],
        notes: data.notes || '',
      });
    }
  }, [data]);

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const saveData = {
        client_id: clientId,
        availability_windows: formData.availability_windows as any,
        hard_constraints: formData.hard_constraints as any,
        preferred_session_length: formData.preferred_session_length,
        preferred_cadence: formData.preferred_cadence,
        max_sessions_per_day: formData.max_sessions_per_day,
        min_gap_between_sessions: formData.min_gap_between_sessions,
        school_schedule: formData.school_schedule as any,
        vacation_blackouts: formData.vacation_blackouts as any,
        notes: formData.notes,
      };

      if (data?.id) {
        const { error } = await supabase
          .from('client_scheduling_preferences')
          .update(saveData)
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('client_scheduling_preferences')
          .insert([saveData]);
        if (error) throw error;
      }

      toast.success('Scheduling preferences saved');
      onRefresh();
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const addAvailabilityWindow = () => {
    const newWindow: AvailabilityWindow = {
      day: 'monday',
      start_time: '09:00',
      end_time: '15:00',
      location_type: 'home',
    };
    setFormData({ ...formData, availability_windows: [...formData.availability_windows, newWindow] });
  };

  const updateWindow = (index: number, updates: Partial<AvailabilityWindow>) => {
    const windows = [...formData.availability_windows];
    windows[index] = { ...windows[index], ...updates };
    setFormData({ ...formData, availability_windows: windows });
  };

  const removeWindow = (index: number) => {
    setFormData({ ...formData, availability_windows: formData.availability_windows.filter((_, i) => i !== index) });
  };

  const addConstraint = () => {
    const newConstraint: HardConstraint = {
      day: 'monday',
      start_time: '12:00',
      end_time: '13:00',
      reason: '',
    };
    setFormData({ ...formData, hard_constraints: [...formData.hard_constraints, newConstraint] });
  };

  const updateConstraint = (index: number, updates: Partial<HardConstraint>) => {
    const constraints = [...formData.hard_constraints];
    constraints[index] = { ...constraints[index], ...updates };
    setFormData({ ...formData, hard_constraints: constraints });
  };

  const removeConstraint = (index: number) => {
    setFormData({ ...formData, hard_constraints: formData.hard_constraints.filter((_, i) => i !== index) });
  };

  const hasAvailability = formData.availability_windows.length > 0;

  return (
    <div className="space-y-6">
      {!hasAvailability && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">At least one availability window is required to activate this client.</span>
        </div>
      )}

      {/* Availability Windows */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Availability Windows <span className="text-destructive">*</span>
            </CardTitle>
            <Button variant="outline" size="sm" onClick={addAvailabilityWindow}>
              <Plus className="h-4 w-4 mr-1" /> Add Window
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {formData.availability_windows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No availability windows set. Add at least one to schedule sessions.
            </p>
          ) : (
            formData.availability_windows.map((window, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                <Select value={window.day} onValueChange={(v) => updateWindow(i, { day: v as any })}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day) => (
                      <SelectItem key={day} value={day} className="capitalize">{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="flex items-center gap-1">
                  <Input
                    type="time"
                    value={window.start_time}
                    onChange={(e) => updateWindow(i, { start_time: e.target.value })}
                    className="w-28"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="time"
                    value={window.end_time}
                    onChange={(e) => updateWindow(i, { end_time: e.target.value })}
                    className="w-28"
                  />
                </div>

                <Select value={window.location_type} onValueChange={(v) => updateWindow(i, { location_type: v as any })}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATION_TYPES.map((loc) => (
                      <SelectItem key={loc.value} value={loc.value}>{loc.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button variant="ghost" size="icon" onClick={() => removeWindow(i)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))
          )}

          {/* Visual Schedule Grid */}
          {formData.availability_windows.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <Label className="text-sm text-muted-foreground mb-2 block">Weekly Overview</Label>
              <div className="grid grid-cols-7 gap-1">
                {DAYS.map((day) => {
                  const dayWindows = formData.availability_windows.filter(w => w.day === day);
                  return (
                    <div key={day} className="text-center">
                      <div className="text-xs font-medium mb-1">{DAY_LABELS[day]}</div>
                      <div className={`h-16 rounded border ${dayWindows.length > 0 ? 'bg-primary/10 border-primary' : 'bg-muted'}`}>
                        {dayWindows.map((w, i) => (
                          <div key={i} className="text-xs text-primary p-1 truncate">
                            {w.start_time.slice(0, 5)}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hard Constraints */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Blocked Times (Hard Constraints) <span className="text-destructive">*</span>
            </CardTitle>
            <Button variant="outline" size="sm" onClick={addConstraint}>
              <Plus className="h-4 w-4 mr-1" /> Add Block
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {formData.hard_constraints.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No blocked times. Add times when sessions cannot be scheduled.
            </p>
          ) : (
            formData.hard_constraints.map((constraint, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border rounded-lg border-destructive/30 bg-destructive/5">
                <Select value={constraint.day} onValueChange={(v) => updateConstraint(i, { day: v })}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day) => (
                      <SelectItem key={day} value={day} className="capitalize">{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="flex items-center gap-1">
                  <Input
                    type="time"
                    value={constraint.start_time}
                    onChange={(e) => updateConstraint(i, { start_time: e.target.value })}
                    className="w-28"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="time"
                    value={constraint.end_time}
                    onChange={(e) => updateConstraint(i, { end_time: e.target.value })}
                    className="w-28"
                  />
                </div>

                <Input
                  value={constraint.reason}
                  onChange={(e) => updateConstraint(i, { reason: e.target.value })}
                  placeholder="Reason (e.g., Lunch, Therapy)"
                  className="flex-1"
                />

                <Button variant="ghost" size="icon" onClick={() => removeConstraint(i)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Session Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Session Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Preferred Session Length (min)</Label>
              <Input
                type="number"
                value={formData.preferred_session_length || ''}
                onChange={(e) => setFormData({ ...formData, preferred_session_length: parseInt(e.target.value) || null })}
                placeholder="e.g., 120"
              />
            </div>
            <div className="space-y-2">
              <Label>Preferred Cadence</Label>
              <Select 
                value={formData.preferred_cadence || ''} 
                onValueChange={(v) => setFormData({ ...formData, preferred_cadence: v as any })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {CADENCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Max Sessions/Day</Label>
              <Input
                type="number"
                min={1}
                value={formData.max_sessions_per_day}
                onChange={(e) => setFormData({ ...formData, max_sessions_per_day: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Min Gap Between (min)</Label>
              <Input
                type="number"
                value={formData.min_gap_between_sessions || ''}
                onChange={(e) => setFormData({ ...formData, min_gap_between_sessions: parseInt(e.target.value) || null })}
                placeholder="e.g., 30"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scheduling Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional scheduling notes, special considerations..."
            rows={4}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Scheduling Preferences'}
        </Button>
      </div>
    </div>
  );
}
