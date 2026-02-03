import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertTriangle, Shield, Pill, Activity, Save, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { ClientSafetyMedical } from '@/types/clientProfile';
import { SAFETY_FLAG_OPTIONS } from '@/types/clientProfile';

interface SafetyMedicalTabProps {
  clientId: string;
  data: ClientSafetyMedical | null;
  onRefresh: () => void;
}

export function SafetyMedicalTab({ clientId, data, onRefresh }: SafetyMedicalTabProps) {
  const [saving, setSaving] = useState(false);
  const [showMedDialog, setShowMedDialog] = useState(false);
  
  const [formData, setFormData] = useState<Partial<ClientSafetyMedical>>({
    safety_flags: data?.safety_flags || [],
    emergency_protocol_present: data?.emergency_protocol_present || false,
    allergies: data?.allergies || [],
    medications: data?.medications || [],
    seizure_protocol: data?.seizure_protocol || '',
    medical_conditions: data?.medical_conditions || [],
    known_triggers: data?.known_triggers || { structured: [], notes: '' },
    deescalation_supports: data?.deescalation_supports || { structured: [], notes: '' },
    dietary_restrictions: data?.dietary_restrictions || [],
    mobility_needs: data?.mobility_needs || '',
    sensory_considerations: data?.sensory_considerations || '',
    other_medical_notes: data?.other_medical_notes || '',
  });

  const [newMed, setNewMed] = useState({ name: '', dose: '', schedule_windows: [''], notes: '' });
  const [newAllergy, setNewAllergy] = useState('');
  const [newCondition, setNewCondition] = useState('');
  const [newTrigger, setNewTrigger] = useState('');
  const [newSupport, setNewSupport] = useState('');

  const highSeverityFlags = formData.safety_flags?.filter(f => 
    SAFETY_FLAG_OPTIONS.find(o => o.value === f)?.severity === 'high'
  ) || [];

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const saveData = {
        client_id: clientId,
        ...formData,
        last_reviewed_at: new Date().toISOString(),
      };

      if (data?.id) {
        const { error } = await supabase
          .from('client_safety_medical')
          .update(saveData)
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('client_safety_medical')
          .insert(saveData);
        if (error) throw error;
      }

      toast.success('Safety & Medical information saved');
      onRefresh();
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const toggleSafetyFlag = (flag: string) => {
    const flags = formData.safety_flags || [];
    if (flags.includes(flag)) {
      setFormData({ ...formData, safety_flags: flags.filter(f => f !== flag) });
    } else {
      setFormData({ ...formData, safety_flags: [...flags, flag] });
    }
  };

  const addMedication = () => {
    if (!newMed.name) return;
    const medications = [...(formData.medications || []), { ...newMed, schedule_windows: newMed.schedule_windows.filter(Boolean) }];
    setFormData({ ...formData, medications });
    setNewMed({ name: '', dose: '', schedule_windows: [''], notes: '' });
    setShowMedDialog(false);
  };

  const removeMedication = (index: number) => {
    const medications = (formData.medications || []).filter((_, i) => i !== index);
    setFormData({ ...formData, medications });
  };

  return (
    <div className="space-y-6">
      {/* Safety Alert Banner */}
      {highSeverityFlags.length > 0 && !formData.emergency_protocol_present && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
          <div>
            <p className="font-medium text-destructive">High-Severity Safety Flags Present</p>
            <p className="text-sm text-muted-foreground mt-1">
              This client has {highSeverityFlags.length} high-severity safety flag(s). 
              Please ensure an emergency protocol is documented and de-escalation supports are in place.
            </p>
          </div>
        </div>
      )}

      {/* Safety Flags */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Safety Flags <span className="text-destructive">*</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {SAFETY_FLAG_OPTIONS.map((flag) => (
              <div 
                key={flag.value}
                className={`flex items-center space-x-2 p-2 rounded border cursor-pointer transition-colors ${
                  formData.safety_flags?.includes(flag.value) 
                    ? flag.severity === 'high' ? 'bg-destructive/10 border-destructive' : 'bg-primary/10 border-primary'
                    : 'hover:bg-muted'
                }`}
                onClick={() => toggleSafetyFlag(flag.value)}
              >
                <Checkbox checked={formData.safety_flags?.includes(flag.value)} />
                <Label className="font-normal cursor-pointer flex items-center gap-1">
                  {flag.label}
                  {flag.severity === 'high' && (
                    <AlertTriangle className="h-3 w-3 text-destructive" />
                  )}
                </Label>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.emergency_protocol_present}
                onCheckedChange={(c) => setFormData({ ...formData, emergency_protocol_present: c })}
              />
              <Label>Emergency Protocol on File <span className="text-destructive">*</span></Label>
            </div>
            {!formData.emergency_protocol_present && highSeverityFlags.length > 0 && (
              <Badge variant="destructive">Required</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Known Triggers & De-escalation */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Known Triggers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {formData.known_triggers?.structured?.map((trigger, i) => (
                <Badge key={i} variant="outline" className="flex items-center gap-1">
                  {trigger}
                  <button onClick={() => {
                    const structured = formData.known_triggers?.structured?.filter((_, idx) => idx !== i) || [];
                    setFormData({ ...formData, known_triggers: { ...formData.known_triggers!, structured } });
                  }}>
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTrigger}
                onChange={(e) => setNewTrigger(e.target.value)}
                placeholder="Add trigger..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTrigger) {
                    const structured = [...(formData.known_triggers?.structured || []), newTrigger];
                    setFormData({ ...formData, known_triggers: { ...formData.known_triggers!, structured } });
                    setNewTrigger('');
                  }
                }}
              />
              <Button variant="outline" size="icon" onClick={() => {
                if (newTrigger) {
                  const structured = [...(formData.known_triggers?.structured || []), newTrigger];
                  setFormData({ ...formData, known_triggers: { ...formData.known_triggers!, structured } });
                  setNewTrigger('');
                }
              }}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <Textarea
              value={formData.known_triggers?.notes || ''}
              onChange={(e) => setFormData({ ...formData, known_triggers: { ...formData.known_triggers!, notes: e.target.value } })}
              placeholder="Additional notes about triggers..."
              rows={3}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">De-escalation Supports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {formData.deescalation_supports?.structured?.map((support, i) => (
                <Badge key={i} variant="outline" className="flex items-center gap-1 bg-green-50">
                  {support}
                  <button onClick={() => {
                    const structured = formData.deescalation_supports?.structured?.filter((_, idx) => idx !== i) || [];
                    setFormData({ ...formData, deescalation_supports: { ...formData.deescalation_supports!, structured } });
                  }}>
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newSupport}
                onChange={(e) => setNewSupport(e.target.value)}
                placeholder="Add support strategy..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newSupport) {
                    const structured = [...(formData.deescalation_supports?.structured || []), newSupport];
                    setFormData({ ...formData, deescalation_supports: { ...formData.deescalation_supports!, structured } });
                    setNewSupport('');
                  }
                }}
              />
              <Button variant="outline" size="icon" onClick={() => {
                if (newSupport) {
                  const structured = [...(formData.deescalation_supports?.structured || []), newSupport];
                  setFormData({ ...formData, deescalation_supports: { ...formData.deescalation_supports!, structured } });
                  setNewSupport('');
                }
              }}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <Textarea
              value={formData.deescalation_supports?.notes || ''}
              onChange={(e) => setFormData({ ...formData, deescalation_supports: { ...formData.deescalation_supports!, notes: e.target.value } })}
              placeholder="Additional de-escalation notes..."
              rows={3}
            />
          </CardContent>
        </Card>
      </div>

      {/* Medical Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Medical Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Allergies</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.allergies?.map((allergy, i) => (
                  <Badge key={i} variant="destructive" className="flex items-center gap-1">
                    {allergy}
                    <button onClick={() => {
                      setFormData({ ...formData, allergies: formData.allergies?.filter((_, idx) => idx !== i) });
                    }}>
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newAllergy}
                  onChange={(e) => setNewAllergy(e.target.value)}
                  placeholder="Add allergy..."
                />
                <Button variant="outline" onClick={() => {
                  if (newAllergy) {
                    setFormData({ ...formData, allergies: [...(formData.allergies || []), newAllergy] });
                    setNewAllergy('');
                  }
                }}>Add</Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Medical Conditions</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.medical_conditions?.map((condition, i) => (
                  <Badge key={i} variant="outline" className="flex items-center gap-1">
                    {condition}
                    <button onClick={() => {
                      setFormData({ ...formData, medical_conditions: formData.medical_conditions?.filter((_, idx) => idx !== i) });
                    }}>
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newCondition}
                  onChange={(e) => setNewCondition(e.target.value)}
                  placeholder="Add condition..."
                />
                <Button variant="outline" onClick={() => {
                  if (newCondition) {
                    setFormData({ ...formData, medical_conditions: [...(formData.medical_conditions || []), newCondition] });
                    setNewCondition('');
                  }
                }}>Add</Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="flex items-center gap-2">
                <Pill className="h-4 w-4" />
                Medications
              </Label>
              <Button variant="outline" size="sm" onClick={() => setShowMedDialog(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Medication
              </Button>
            </div>
            {formData.medications?.length === 0 ? (
              <p className="text-sm text-muted-foreground">No medications recorded</p>
            ) : (
              <div className="space-y-2">
                {formData.medications?.map((med, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{med.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {med.dose} {med.schedule_windows?.length > 0 && `• ${med.schedule_windows.join(', ')}`}
                      </p>
                      {med.notes && <p className="text-xs text-muted-foreground mt-1">{med.notes}</p>}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeMedication(i)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Seizure Protocol</Label>
            <Textarea
              value={formData.seizure_protocol || ''}
              onChange={(e) => setFormData({ ...formData, seizure_protocol: e.target.value })}
              placeholder="Document seizure protocol if applicable..."
              rows={3}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mobility Needs</Label>
              <Input
                value={formData.mobility_needs || ''}
                onChange={(e) => setFormData({ ...formData, mobility_needs: e.target.value })}
                placeholder="Wheelchair, walker, etc."
              />
            </div>
            <div className="space-y-2">
              <Label>Sensory Considerations</Label>
              <Input
                value={formData.sensory_considerations || ''}
                onChange={(e) => setFormData({ ...formData, sensory_considerations: e.target.value })}
                placeholder="Noise sensitivity, etc."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Other Medical Notes</Label>
            <Textarea
              value={formData.other_medical_notes || ''}
              onChange={(e) => setFormData({ ...formData, other_medical_notes: e.target.value })}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Safety & Medical'}
        </Button>
      </div>

      {/* Add Medication Dialog */}
      <Dialog open={showMedDialog} onOpenChange={setShowMedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Medication</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Medication Name <span className="text-destructive">*</span></Label>
              <Input
                value={newMed.name}
                onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Dose</Label>
              <Input
                value={newMed.dose}
                onChange={(e) => setNewMed({ ...newMed, dose: e.target.value })}
                placeholder="e.g., 10mg"
              />
            </div>
            <div className="space-y-2">
              <Label>Schedule/Times</Label>
              <Input
                value={newMed.schedule_windows[0]}
                onChange={(e) => setNewMed({ ...newMed, schedule_windows: [e.target.value] })}
                placeholder="e.g., Morning, With meals"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={newMed.notes}
                onChange={(e) => setNewMed({ ...newMed, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMedDialog(false)}>Cancel</Button>
            <Button onClick={addMedication}>Add Medication</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
