/**
 * Nova AI Clinical Capture - Quick Start Modal / Bottom Sheet
 * Fast-launch for recordings from anywhere in the app.
 */

import { useState } from 'react';
import { Mic, X, User, Lock, ChevronRight, Upload, FileText, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { VoiceCaptureConfig, VoiceCaptureMode } from '@/types/voiceCapture';

interface QuickStartModalProps {
  onStart: (config: VoiceCaptureConfig) => void;
  onMoreOptions: () => void;
  onClose: () => void;
  defaultClientId?: string;
  defaultClientName?: string;
  defaultSourcePage?: string;
}

const MODE_OPTIONS: Array<{ mode: VoiceCaptureMode; label: string; icon: typeof Zap; description: string }> = [
  { mode: 'quick_note', label: 'Quick Note', icon: Zap, description: 'Private dictation or quick capture' },
  { mode: 'full_clinical', label: 'Full Clinical', icon: FileText, description: 'Full setup with encounter details' },
  { mode: 'upload_audio', label: 'Upload Audio', icon: Upload, description: 'Upload an existing recording' },
];

export function QuickStartModal({ onStart, onMoreOptions, onClose, defaultClientId, defaultClientName, defaultSourcePage }: QuickStartModalProps) {
  const [selectedMode, setSelectedMode] = useState<VoiceCaptureMode>('quick_note');

  const handleStartNow = () => {
    if (selectedMode === 'full_clinical') {
      onMoreOptions();
      return;
    }

    onStart({
      captureMode: selectedMode,
      encounterType: selectedMode === 'quick_note' ? 'quick_note' : 'quick_note',
      saveIntent: 'private_only',
      languageMode: 'auto',
      speakerMode: 'auto',
      consentStatus: defaultClientId ? 'verbal_consent' : 'private_dictation_only',
      privacyMode: 'private',
      clientId: defaultClientId,
      clientName: defaultClientName,
      sourcePage: defaultSourcePage,
    });
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      <div className="w-full max-w-md bg-card border rounded-t-2xl sm:rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
              <Mic className="w-4 h-4 text-destructive" />
            </div>
            <h2 className="font-semibold text-base">Start Capture</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Context Badge */}
          {defaultClientId ? (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Recording for:</span>
                <Badge variant="secondary">{defaultClientName || 'Selected Learner'}</Badge>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Private / Unlinked</span>
              </div>
            </div>
          )}

          {/* Mode Selection */}
          <div className="space-y-2">
            {MODE_OPTIONS.map(({ mode, label, icon: Icon, description }) => (
              <button
                key={mode}
                onClick={() => setSelectedMode(mode)}
                className={`w-full text-left p-3 rounded-lg border transition-all flex items-center gap-3 ${
                  selectedMode === mode
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                    : 'hover:bg-muted/50'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  selectedMode === mode ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                {selectedMode === mode && <ChevronRight className="w-4 h-4 text-primary" />}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button variant="outline" onClick={onMoreOptions} className="text-xs">
            More Options
          </Button>
          <Button
            onClick={handleStartNow}
            className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            <Mic className="w-4 h-4 mr-2" />
            Start Now
          </Button>
        </div>
      </div>
    </div>
  );
}
