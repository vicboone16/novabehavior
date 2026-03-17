/**
 * Nova AI Clinical Capture - Capture Center
 * Dedicated workspace for recordings, transcripts, summaries, AI Q&A, and save actions.
 */

import { useState, useEffect } from 'react';
import { Mic, FileAudio, Clock, Shield, Eye, Search, Plus, Upload, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CaptureSetupSheet } from '@/components/voice-capture/CaptureSetupSheet';
import { RecordingReviewWorkspace } from '@/components/voice-capture/RecordingReviewWorkspace';
import { useVoiceCaptureEngine } from '@/hooks/useVoiceCaptureEngine';
import { ENCOUNTER_TYPE_LABELS, PRIVACY_LABELS, type VoiceRecording, type VoiceCaptureConfig } from '@/types/voiceCapture';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function CaptureCenter() {
  const { user } = useAuth();
  const [recordings, setRecordings] = useState<VoiceRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('all');

  const engine = useVoiceCaptureEngine();

  const fetchRecordings = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('voice_recordings' as any)
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      setRecordings(data as unknown as VoiceRecording[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRecordings();
  }, [user]);

  const handleStart = async (config: VoiceCaptureConfig) => {
    setShowSetup(false);
    const recId = await engine.startRecording(config);
    if (recId) {
      toast.success('Recording started');
    }
  };

  const handleStopAndRefresh = async () => {
    await engine.stopRecording();
    await fetchRecordings();
  };

  const filteredRecordings = recordings.filter(r => {
    if (filterTab === 'private') return r.privacy_mode === 'private';
    if (filterTab === 'chart') return r.privacy_mode !== 'private';
    if (filterTab === 'drafts') return r.status === 'saved_draft' || r.status === 'review_ready';
    return true;
  });

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      recording_active: { variant: 'destructive', label: 'Recording' },
      audio_secured: { variant: 'secondary', label: 'Secured' },
      processing: { variant: 'default', label: 'Processing' },
      review_ready: { variant: 'default', label: 'Ready for Review' },
      saved_draft: { variant: 'outline', label: 'Draft' },
      posted: { variant: 'default', label: 'Posted' },
      archived: { variant: 'secondary', label: 'Archived' },
    };
    const info = map[status] || { variant: 'outline' as const, label: status };
    return <Badge variant={info.variant} className="text-[10px]">{info.label}</Badge>;
  };

  if (selectedRecording) {
    return (
      <RecordingReviewWorkspace
        recordingId={selectedRecording}
        onBack={() => { setSelectedRecording(null); fetchRecordings(); }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mic className="w-6 h-6 text-destructive" />
            Clinical Capture
          </h1>
          <p className="text-sm text-muted-foreground">Secure voice capture & AI documentation engine</p>
        </div>
        <div className="flex items-center gap-2">
          {engine.state.isRecording ? (
            <Button variant="destructive" onClick={handleStopAndRefresh}>
              Stop Recording ({Math.floor(engine.state.elapsedSeconds / 60)}:{(engine.state.elapsedSeconds % 60).toString().padStart(2, '0')})
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-1" />
                Upload Audio
              </Button>
              <Button onClick={() => setShowSetup(true)}>
                <Plus className="w-4 h-4 mr-1" />
                New Capture
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold">{recordings.length}</div>
            <p className="text-xs text-muted-foreground">Total Recordings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold">
              {recordings.filter(r => r.status === 'review_ready').length}
            </div>
            <p className="text-xs text-muted-foreground">Ready for Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold">
              {recordings.filter(r => r.privacy_mode === 'private').length}
            </div>
            <p className="text-xs text-muted-foreground">Private</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold">
              {recordings.filter(r => r.status === 'posted').length}
            </div>
            <p className="text-xs text-muted-foreground">Posted to Chart</p>
          </CardContent>
        </Card>
      </div>

      {/* Recordings List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recordings</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  className="h-8 w-48 pl-8 text-xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
          <Tabs value={filterTab} onValueChange={setFilterTab}>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs h-7">All</TabsTrigger>
              <TabsTrigger value="private" className="text-xs h-7">Private</TabsTrigger>
              <TabsTrigger value="chart" className="text-xs h-7">Chart-Linked</TabsTrigger>
              <TabsTrigger value="drafts" className="text-xs h-7">Drafts</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading recordings...</div>
          ) : filteredRecordings.length === 0 ? (
            <div className="text-center py-12">
              <FileAudio className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No recordings yet</p>
              <p className="text-xs text-muted-foreground mt-1">Start a new capture to begin</p>
              <Button onClick={() => setShowSetup(true)} size="sm" className="mt-4">
                <Mic className="w-4 h-4 mr-1" />
                New Capture
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredRecordings.map(rec => (
                <button
                  key={rec.id}
                  className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors flex items-center gap-3"
                  onClick={() => setSelectedRecording(rec.id)}
                >
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Mic className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {ENCOUNTER_TYPE_LABELS[rec.encounter_type] || rec.encounter_type}
                      </span>
                      {getStatusBadge(rec.status)}
                      {rec.privacy_mode === 'private' && (
                        <Badge variant="outline" className="text-[10px]">
                          <Shield className="w-2.5 h-2.5 mr-0.5" /> Private
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(rec.duration_seconds)}
                      </span>
                      <span>{format(new Date(rec.created_at), 'MMM d, yyyy h:mm a')}</span>
                    </div>
                  </div>
                  <Eye className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Sheet */}
      {showSetup && (
        <CaptureSetupSheet
          onStart={handleStart}
          onClose={() => setShowSetup(false)}
        />
      )}
    </div>
  );
}
