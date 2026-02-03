import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Languages, Save, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { ClientCommunicationAccess } from '@/types/clientProfile';
import { COMMUNICATION_MODES } from '@/types/clientProfile';

interface CommunicationTabProps {
  clientId: string;
  data: ClientCommunicationAccess | null;
  onRefresh: () => void;
}

const LANGUAGES = [
  'English', 'Spanish', 'Mandarin', 'Cantonese', 'Vietnamese', 
  'Korean', 'Tagalog', 'Arabic', 'Russian', 'Portuguese', 
  'French', 'Hindi', 'Urdu', 'Japanese', 'Other'
];

export function CommunicationTab({ clientId, data, onRefresh }: CommunicationTabProps) {
  const [saving, setSaving] = useState(false);
  const [newSecondaryLang, setNewSecondaryLang] = useState('');

  const [formData, setFormData] = useState({
    primary_language: data?.primary_language || 'English',
    secondary_languages: data?.secondary_languages || [],
    preferred_language_for_caregiver_comms: data?.preferred_language_for_caregiver_comms || 'English',
    interpreter_required: data?.interpreter_required || false,
    interpreter_language: data?.interpreter_language || '',
    communication_mode: data?.communication_mode || null,
    aac_device_type: data?.aac_device_type || '',
    aac_notes: data?.aac_notes || '',
    sensory_preferences: data?.sensory_preferences || { visual: [], auditory: [], tactile: [], notes: '' },
    cultural_notes: data?.cultural_notes || '',
    cultural_notes_visibility: data?.cultural_notes_visibility || 'clinical_team',
  });

  useEffect(() => {
    if (data) {
      setFormData({
        primary_language: data.primary_language,
        secondary_languages: data.secondary_languages || [],
        preferred_language_for_caregiver_comms: data.preferred_language_for_caregiver_comms,
        interpreter_required: data.interpreter_required,
        interpreter_language: data.interpreter_language || '',
        communication_mode: data.communication_mode,
        aac_device_type: data.aac_device_type || '',
        aac_notes: data.aac_notes || '',
        sensory_preferences: data.sensory_preferences || { visual: [], auditory: [], tactile: [], notes: '' },
        cultural_notes: data.cultural_notes || '',
        cultural_notes_visibility: data.cultural_notes_visibility || 'clinical_team',
      });
    }
  }, [data]);

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const saveData = {
        client_id: clientId,
        ...formData,
      };

      if (data?.id) {
        const { error } = await supabase
          .from('client_communication_access')
          .update(saveData)
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('client_communication_access')
          .insert(saveData);
        if (error) throw error;
      }

      toast.success('Communication preferences saved');
      onRefresh();
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const addSensoryPref = (category: 'visual' | 'auditory' | 'tactile', value: string) => {
    if (!value) return;
    const updated = { ...formData.sensory_preferences };
    updated[category] = [...(updated[category] || []), value];
    setFormData({ ...formData, sensory_preferences: updated });
  };

  const removeSensoryPref = (category: 'visual' | 'auditory' | 'tactile', index: number) => {
    const updated = { ...formData.sensory_preferences };
    updated[category] = updated[category].filter((_: string, i: number) => i !== index);
    setFormData({ ...formData, sensory_preferences: updated });
  };

  return (
    <div className="space-y-6">
      {/* Language Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Languages className="h-4 w-4" />
            Language Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Primary Language <span className="text-destructive">*</span></Label>
              <Select 
                value={formData.primary_language} 
                onValueChange={(v) => setFormData({ ...formData, primary_language: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Preferred Language for Caregiver Communications <span className="text-destructive">*</span></Label>
              <Select 
                value={formData.preferred_language_for_caregiver_comms} 
                onValueChange={(v) => setFormData({ ...formData, preferred_language_for_caregiver_comms: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Secondary Languages</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.secondary_languages.map((lang: string, i: number) => (
                <Badge key={i} variant="secondary" className="flex items-center gap-1">
                  {lang}
                  <button onClick={() => {
                    setFormData({ 
                      ...formData, 
                      secondary_languages: formData.secondary_languages.filter((_: string, idx: number) => idx !== i) 
                    });
                  }}>
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Select value={newSecondaryLang} onValueChange={setNewSecondaryLang}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Add language..." />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.filter(l => !formData.secondary_languages.includes(l) && l !== formData.primary_language).map((lang) => (
                    <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => {
                if (newSecondaryLang) {
                  setFormData({ ...formData, secondary_languages: [...formData.secondary_languages, newSecondaryLang] });
                  setNewSecondaryLang('');
                }
              }}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.interpreter_required}
                onCheckedChange={(c) => setFormData({ ...formData, interpreter_required: c })}
              />
              <Label>Interpreter Required <span className="text-destructive">*</span></Label>
            </div>
          </div>

          {formData.interpreter_required && (
            <div className="space-y-2">
              <Label>Interpreter Language</Label>
              <Select 
                value={formData.interpreter_language} 
                onValueChange={(v) => setFormData({ ...formData, interpreter_language: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select language..." />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Communication Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Communication Mode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Primary Communication Mode</Label>
            <Select 
              value={formData.communication_mode || ''} 
              onValueChange={(v) => setFormData({ ...formData, communication_mode: v as any })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select mode..." />
              </SelectTrigger>
              <SelectContent>
                {COMMUNICATION_MODES.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>{mode.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(formData.communication_mode === 'aac' || formData.communication_mode === 'mixed') && (
            <>
              <div className="space-y-2">
                <Label>AAC Device Type</Label>
                <Input
                  value={formData.aac_device_type}
                  onChange={(e) => setFormData({ ...formData, aac_device_type: e.target.value })}
                  placeholder="e.g., Proloquo2Go, TouchChat, LAMP"
                />
              </div>
              <div className="space-y-2">
                <Label>AAC Notes</Label>
                <Textarea
                  value={formData.aac_notes}
                  onChange={(e) => setFormData({ ...formData, aac_notes: e.target.value })}
                  placeholder="Programming needs, vocabulary sets, access method..."
                  rows={3}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Sensory Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sensory Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            {(['visual', 'auditory', 'tactile'] as const).map((category) => (
              <div key={category} className="space-y-2">
                <Label className="capitalize">{category}</Label>
                <div className="flex flex-wrap gap-1 mb-2 min-h-[32px]">
                  {formData.sensory_preferences[category]?.map((pref: string, i: number) => (
                    <Badge key={i} variant="outline" className="text-xs flex items-center gap-1">
                      {pref}
                      <button onClick={() => removeSensoryPref(category, i)}>
                        <Trash2 className="h-2 w-2" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <Input
                  placeholder={`Add ${category} preference...`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addSensoryPref(category, (e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Sensory Notes</Label>
            <Textarea
              value={formData.sensory_preferences.notes}
              onChange={(e) => setFormData({ 
                ...formData, 
                sensory_preferences: { ...formData.sensory_preferences, notes: e.target.value } 
              })}
              placeholder="Additional sensory considerations..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Cultural Considerations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cultural Considerations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Cultural Notes</Label>
            <Textarea
              value={formData.cultural_notes}
              onChange={(e) => setFormData({ ...formData, cultural_notes: e.target.value })}
              placeholder="Important cultural considerations for working with this family..."
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label>Visibility</Label>
            <Select 
              value={formData.cultural_notes_visibility} 
              onValueChange={(v: any) => setFormData({ ...formData, cultural_notes_visibility: v })}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="internal_only">Internal Only</SelectItem>
                <SelectItem value="clinical_team">Clinical Team</SelectItem>
                <SelectItem value="school_team">School Team</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Communication Settings'}
        </Button>
      </div>
    </div>
  );
}
