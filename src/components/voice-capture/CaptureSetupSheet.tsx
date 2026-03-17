/**
 * Nova AI Clinical Capture - Setup Sheet
 * Shown before recording begins. Collects encounter context, consent, privacy.
 */

import { useState } from 'react';
import { X, Mic, Shield, User, FileText, Globe, Users, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  type VoiceCaptureConfig,
  type VoiceEncounterType,
  type VoiceCaptureMode,
  type VoiceSaveIntent,
  type VoiceConsentStatus,
  type VoicePrivacyMode,
  type VoiceLanguageMode,
  type VoiceSpeakerMode,
  ENCOUNTER_TYPE_LABELS,
  CONSENT_LABELS,
  PRIVACY_LABELS,
  SAVE_INTENT_LABELS,
  isPrivateEncounter,
} from '@/types/voiceCapture';

interface CaptureSetupSheetProps {
  onStart: (config: VoiceCaptureConfig) => void;
  onClose: () => void;
  defaultClientId?: string;
  defaultClientName?: string;
  defaultSourcePage?: string;
  defaultSourceEntityId?: string;
}

export function CaptureSetupSheet({
  onStart,
  onClose,
  defaultClientId,
  defaultClientName,
  defaultSourcePage,
  defaultSourceEntityId,
}: CaptureSetupSheetProps) {
  const [captureMode, setCaptureMode] = useState<VoiceCaptureMode>('quick_note');
  const [encounterType, setEncounterType] = useState<VoiceEncounterType>('quick_note');
  const [saveIntent, setSaveIntent] = useState<VoiceSaveIntent>('private_only');
  const [languageMode, setLanguageMode] = useState<VoiceLanguageMode>('auto');
  const [speakerMode, setSpeakerMode] = useState<VoiceSpeakerMode>('auto');
  const [consentStatus, setConsentStatus] = useState<VoiceConsentStatus>(
    defaultClientId ? 'not_set' : 'private_dictation_only'
  );
  const [privacyMode, setPrivacyMode] = useState<VoicePrivacyMode>('private');

  const isPrivate = isPrivateEncounter(encounterType);
  const needsConsent = !isPrivate && consentStatus === 'not_set';

  const handleStart = () => {
    if (needsConsent) return;

    onStart({
      captureMode,
      encounterType,
      saveIntent,
      languageMode,
      speakerMode,
      consentStatus: isPrivate ? 'private_dictation_only' : consentStatus,
      privacyMode,
      clientId: defaultClientId,
      clientName: defaultClientName,
      sourcePage: defaultSourcePage,
      sourceEntityId: defaultSourceEntityId,
    });
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      <div className="w-full max-w-lg bg-card border rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
              <Mic className="w-4 h-4 text-destructive" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Start Capture</h2>
              <p className="text-xs text-muted-foreground">Nova AI Clinical Capture</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1 px-5 py-4">
          <div className="space-y-5">
            {/* Linked Subject */}
            {defaultClientId && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Recording under:</span>
                  <Badge variant="secondary">{defaultClientName || 'Selected Learner'}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Or change to private / unlinked below
                </p>
              </div>
            )}

            {/* Capture Mode */}
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5" /> Capture Mode
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {(['quick_note', 'full_clinical', 'upload_audio'] as VoiceCaptureMode[]).map(mode => (
                  <Button
                    key={mode}
                    variant={captureMode === mode ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCaptureMode(mode)}
                    className="text-xs"
                  >
                    {mode === 'quick_note' ? 'Quick Note' : mode === 'full_clinical' ? 'Full Clinical' : 'Upload Audio'}
                  </Button>
                ))}
              </div>
            </div>

            {/* Encounter Type */}
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Encounter Type
              </Label>
              <Select value={encounterType} onValueChange={(v) => setEncounterType(v as VoiceEncounterType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ENCOUNTER_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Save Intent */}
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Save Intent
              </Label>
              <Select value={saveIntent} onValueChange={(v) => setSaveIntent(v as VoiceSaveIntent)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SAVE_INTENT_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Language */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" /> Language
                </Label>
                <Select value={languageMode} onValueChange={(v) => setLanguageMode(v as VoiceLanguageMode)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-detect</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="bilingual">Bilingual</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Speakers
                </Label>
                <Select value={speakerMode} onValueChange={(v) => setSpeakerMode(v as VoiceSpeakerMode)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto separation</SelectItem>
                    <SelectItem value="tag_later">Tag later</SelectItem>
                    <SelectItem value="single_speaker">Single speaker</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Consent - Required for non-private */}
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" /> Consent Status
                {needsConsent && <Badge variant="destructive" className="text-[10px] ml-1">Required</Badge>}
              </Label>
              <RadioGroup
                value={consentStatus}
                onValueChange={(v) => setConsentStatus(v as VoiceConsentStatus)}
                className="space-y-1"
              >
                {Object.entries(CONSENT_LABELS).filter(([k]) => k !== 'not_set').map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2">
                    <RadioGroupItem value={key} id={`consent-${key}`} />
                    <Label htmlFor={`consent-${key}`} className="text-sm cursor-pointer">{label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Privacy */}
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Privacy
              </Label>
              <RadioGroup
                value={privacyMode}
                onValueChange={(v) => setPrivacyMode(v as VoicePrivacyMode)}
                className="space-y-1"
              >
                {Object.entries(PRIVACY_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2">
                    <RadioGroupItem value={key} id={`privacy-${key}`} />
                    <Label htmlFor={`privacy-${key}`} className="text-sm cursor-pointer">{label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-5 py-4 border-t flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button
            onClick={handleStart}
            disabled={needsConsent}
            className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            <Mic className="w-4 h-4 mr-2" />
            Start Recording
          </Button>
        </div>
      </div>
    </div>
  );
}
