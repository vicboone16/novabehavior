import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Calendar, BarChart3, Target, BrainCircuit, Zap, Lightbulb,
  MessageSquare, ClipboardCheck, FileText, Plus, Loader2, RefreshCw,
  Sparkles, AlertTriangle, History
} from 'lucide-react';
import { toast } from 'sonner';
import { useIEPEngineData, type IEPMeeting } from './useIEPEngineData';
import { IEPMeetingContextSection } from './IEPMeetingContextSection';
import { IEPBehaviorIntelligenceSection } from './IEPBehaviorIntelligenceSection';
import { IEPGoalProgressSection } from './IEPGoalProgressSection';
import { IEPClinicalInsightsSection } from './IEPClinicalInsightsSection';
import { IEPRecommendationsSection } from './IEPRecommendationsSection';
import { IEPGoalSuggestionsSection } from './IEPGoalSuggestionsSection';
import { IEPTalkingPointsSection } from './IEPTalkingPointsSection';
import { IEPDocumentsChecklistSection } from './IEPDocumentsChecklistSection';
import { IEPMeetingPacketBuilder } from './IEPMeetingPacketBuilder';
import { GoalSuggestionEnginePanel } from '@/components/optimization/GoalSuggestionEnginePanel';
import { IEPExportHistorySection } from './IEPExportHistorySection';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

interface Props {
  studentId: string;
}

const SECTIONS = [
  { key: 'context', label: 'Context', icon: Calendar },
  { key: 'behavior', label: 'Behavior', icon: AlertTriangle },
  { key: 'goals', label: 'Goals', icon: Target },
  { key: 'insights', label: 'Insights', icon: BrainCircuit },
  { key: 'recommendations', label: 'Changes', icon: Zap },
  { key: 'suggestions', label: 'Suggestions', icon: Lightbulb },
  { key: 'talking_points', label: 'Talking Pts', icon: MessageSquare },
  { key: 'documents', label: 'Docs', icon: ClipboardCheck },
  { key: 'packet', label: 'Packet', icon: FileText },
];

const MEETING_TYPES = [
  { value: 'annual_review', label: 'Annual Review' },
  { value: 'triennial', label: 'Triennial' },
  { value: 'amendment', label: 'Amendment' },
  { value: 'initial', label: 'Initial' },
  { value: 'transition', label: 'Transition' },
];

export function IEPIntelligenceEngine({ studentId }: Props) {
  const [meetingSessionId, setMeetingSessionId] = useState<string | null>(null);
  const [existingMeetings, setExistingMeetings] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);

  // Create form
  const [meetingType, setMeetingType] = useState('annual_review');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [schoolName, setSchoolName] = useState('');

  const engine = useIEPEngineData(studentId, meetingSessionId);

  // Load existing meetings for student
  useEffect(() => {
    db.from('iep_meeting_sessions')
      .select('id, meeting_title, meeting_date, meeting_type, status')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .then(({ data }: any) => {
        setExistingMeetings(data || []);
        if (data && data.length > 0) {
          setMeetingSessionId(data[0].id);
        }
        setInitLoading(false);
      });
  }, [studentId]);

  const handleCreate = async () => {
    setCreateLoading(true);
    try {
      const meeting = await engine.createMeeting({
        meeting_type: meetingType,
        meeting_date: meetingDate || undefined,
        meeting_title: meetingTitle || `IEP ${meetingType.replace(/_/g, ' ')}`,
        school_name: schoolName || undefined,
      } as any);
      if (meeting) {
        // Seed defaults
        await Promise.all([
          engine.seedChecklist(meeting.id),
          engine.seedTalkingPoints(meeting.id),
          engine.pushOptimization(meeting.id),
          engine.pushGoalDrafts(meeting.id),
          engine.seedSnapshot(meeting.id),
        ]);
        setMeetingSessionId(meeting.id);
        setExistingMeetings(prev => [meeting, ...prev]);
        setShowCreate(false);
        engine.refresh();
        toast.success('IEP meeting workspace created with defaults seeded');
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to create meeting');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleRefreshData = async () => {
    if (!meetingSessionId) return;
    await Promise.all([
      engine.pushOptimization(meetingSessionId),
      engine.pushGoalDrafts(meetingSessionId),
    ]);
    engine.refresh();
    toast.success('Data refreshed');
  };

  if (initLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // No meeting yet — show creation + goal suggestion engine
  if (!meetingSessionId) {
    return (
      <div className="space-y-4">
        <GoalSuggestionEnginePanel studentId={studentId} surface="iep_prep" />

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-primary" />
                IEP Intelligence Engine
              </CardTitle>
              <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" /> New Meeting Workspace
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Create an IEP meeting workspace to prepare data summaries, goal suggestions, and meeting packets.
            </p>
          </CardHeader>
          <CardContent>
            {showCreate ? (
              <div className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label className="text-xs">Meeting Type</Label>
                  <Select value={meetingType} onValueChange={setMeetingType}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MEETING_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Meeting Date</Label>
                  <Input type="date" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} className="h-8 text-xs" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Title (optional)</Label>
                  <Input value={meetingTitle} onChange={e => setMeetingTitle(e.target.value)} placeholder="e.g. Annual Review 2026" className="h-8 text-xs" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">School Name</Label>
                  <Input value={schoolName} onChange={e => setSchoolName(e.target.value)} placeholder="School name" className="h-8 text-xs" />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleCreate} disabled={createLoading} className="gap-1.5">
                    {createLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                    Create Workspace
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <BrainCircuit className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  Start a new IEP meeting workspace to auto-pull intelligence data, behavior trends, goal progress, and generate a meeting packet.
                </p>
                <Button variant="outline" onClick={() => setShowCreate(true)} className="gap-1.5">
                  <Plus className="w-4 h-4" /> Create IEP Meeting Workspace
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Active meeting workspace
  return (
    <div className="space-y-4">
      {/* Header with meeting switcher */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrainCircuit className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-sm font-bold text-foreground">IEP Intelligence Engine</h2>
            <p className="text-[10px] text-muted-foreground">Meeting workspace for strategic IEP preparation</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {existingMeetings.length > 1 && (
            <Select value={meetingSessionId} onValueChange={setMeetingSessionId}>
              <SelectTrigger className="h-7 text-xs w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {existingMeetings.map(m => (
                  <SelectItem key={m.id} value={m.id} className="text-xs">
                    {m.meeting_title || m.meeting_type?.replace(/_/g, ' ') || 'Meeting'} {m.meeting_date ? `(${m.meeting_date})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleRefreshData}>
            <RefreshCw className="w-3 h-3" /> Refresh
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => { setMeetingSessionId(null); setShowCreate(true); }}>
            <Plus className="w-3 h-3" /> New
          </Button>
        </div>
      </div>

      {/* Meeting Context at top */}
      <IEPMeetingContextSection meeting={engine.meeting} checklistItems={engine.checklistItems} attendees={engine.attendees} />

      {/* Tabbed Workspace */}
      {engine.loading ? (
        <Card><CardContent className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></CardContent></Card>
      ) : (
        <Tabs defaultValue="behavior" className="w-full">
          <TabsList className="w-full flex flex-wrap h-auto gap-0.5 bg-muted/50 p-1">
            {SECTIONS.filter(s => s.key !== 'context').map(s => (
              <TabsTrigger key={s.key} value={s.key} className="text-[10px] gap-1 px-2 py-1.5 flex-1 min-w-0">
                <s.icon className="w-3 h-3" />
                <span className="hidden sm:inline">{s.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="behavior" className="mt-3">
            <IEPBehaviorIntelligenceSection
              behaviorSummary={engine.behaviorSummary}
              intelligenceContext={engine.intelligenceContext}
              studentId={studentId}
              onAddTalkingPoint={meetingSessionId ? (cat, text) => engine.addTalkingPoint(meetingSessionId, cat, text) : undefined}
            />
          </TabsContent>

          <TabsContent value="goals" className="mt-3">
            <IEPGoalProgressSection
              goalProgress={engine.goalProgress}
              studentId={studentId}
              onAddTalkingPoint={meetingSessionId ? (cat, text) => engine.addTalkingPoint(meetingSessionId, cat, text) : undefined}
            />
          </TabsContent>

          <TabsContent value="insights" className="mt-3">
            <IEPClinicalInsightsSection
              intelligenceContext={engine.intelligenceContext}
              snapshot={engine.snapshot}
              studentId={studentId}
            />
          </TabsContent>

          <TabsContent value="recommendations" className="mt-3">
            <IEPRecommendationsSection recommendations={engine.recommendations} studentId={studentId} />
          </TabsContent>

          <TabsContent value="suggestions" className="mt-3 space-y-4">
            <GoalSuggestionEnginePanel studentId={studentId} surface="iep_prep" />
            <IEPGoalSuggestionsSection goalDrafts={engine.goalDrafts} studentId={studentId} onRefresh={engine.refresh} />
          </TabsContent>

          <TabsContent value="talking_points" className="mt-3">
            <IEPTalkingPointsSection
              talkingPoints={engine.talkingPoints}
              meetingSessionId={meetingSessionId}
              onAdd={(cat, text) => engine.addTalkingPoint(meetingSessionId, cat, text)}
            />
          </TabsContent>

          <TabsContent value="documents" className="mt-3">
            <IEPDocumentsChecklistSection
              checklistItems={engine.checklistItems}
              attendees={engine.attendees}
              meetingSessionId={meetingSessionId}
              onToggleChecklist={engine.toggleChecklistItem}
              onAddAttendee={(name, role) => engine.addAttendee(meetingSessionId, name, role)}
            />
          </TabsContent>

          <TabsContent value="packet" className="mt-3">
            <IEPMeetingPacketBuilder
              meeting={engine.meeting}
              behaviorSummary={engine.behaviorSummary}
              goalProgress={engine.goalProgress}
              recommendations={engine.recommendations}
              goalDrafts={engine.goalDrafts}
              talkingPoints={engine.talkingPoints}
              checklistItems={engine.checklistItems}
              attendees={engine.attendees}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
