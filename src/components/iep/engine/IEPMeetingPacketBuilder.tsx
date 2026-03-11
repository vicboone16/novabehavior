import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  meeting: any;
  behaviorSummary: any[];
  goalProgress: any[];
  recommendations: any[];
  goalDrafts: any[];
  talkingPoints: any[];
  checklistItems: any[];
  attendees: any[];
}

interface PacketSection {
  key: string;
  label: string;
  count: number;
}

export function IEPMeetingPacketBuilder({ meeting, behaviorSummary, goalProgress, recommendations, goalDrafts, talkingPoints, checklistItems, attendees }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(['behavior', 'goals', 'recommendations', 'suggestions', 'talking_points']));
  const [generating, setGenerating] = useState(false);

  const sections: PacketSection[] = [
    { key: 'behavior', label: 'Behavior Summary', count: behaviorSummary.length },
    { key: 'goals', label: 'Goal Progress', count: goalProgress.length },
    { key: 'recommendations', label: 'Recommendations', count: recommendations.length },
    { key: 'suggestions', label: 'Goal Suggestions', count: goalDrafts.filter(d => d.status !== 'excluded').length },
    { key: 'talking_points', label: 'Talking Points', count: talkingPoints.length },
    { key: 'checklist', label: 'Checklist', count: checklistItems.length },
    { key: 'attendees', label: 'Attendees', count: attendees.length },
  ];

  const toggle = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      // Build packet text
      const parts: string[] = [];
      parts.push(`IEP MEETING PACKET`);
      if (meeting?.meeting_title) parts.push(`Meeting: ${meeting.meeting_title}`);
      if (meeting?.meeting_date) parts.push(`Date: ${meeting.meeting_date}`);
      if (meeting?.school_name) parts.push(`School: ${meeting.school_name}`);
      parts.push('');

      if (selected.has('behavior') && behaviorSummary.length > 0) {
        parts.push('=== BEHAVIOR SUMMARY ===');
        behaviorSummary.forEach(b => {
          parts.push(`• ${b.problem_behavior_name}: ${b.problem_behavior_count} incidents, replacement ratio: ${b.replacement_to_problem_ratio?.toFixed(2) || 'N/A'}`);
        });
        parts.push('');
      }

      if (selected.has('goals') && goalProgress.length > 0) {
        parts.push('=== GOAL PROGRESS ===');
        goalProgress.forEach(g => {
          parts.push(`• Target ${g.student_target_id?.slice(0, 8)}: ${g.percent_to_mastery}% to mastery, status: ${g.mastery_status}`);
        });
        parts.push('');
      }

      if (selected.has('recommendations') && recommendations.length > 0) {
        parts.push('=== RECOMMENDATIONS ===');
        recommendations.forEach(r => {
          parts.push(`• [${r.severity}] ${r.title}: ${r.rationale || ''}`);
        });
        parts.push('');
      }

      if (selected.has('suggestions')) {
        const approved = goalDrafts.filter(d => d.status !== 'excluded');
        if (approved.length > 0) {
          parts.push('=== GOAL SUGGESTIONS ===');
          approved.forEach(d => {
            parts.push(`• ${d.draft_title}: ${d.goal_text || ''}`);
            if (d.benchmark_text) parts.push(`  Benchmark: ${d.benchmark_text}`);
          });
          parts.push('');
        }
      }

      if (selected.has('talking_points') && talkingPoints.length > 0) {
        parts.push('=== TALKING POINTS ===');
        talkingPoints.forEach(tp => {
          parts.push(`• [${tp.point_category}] ${tp.point_text}`);
        });
        parts.push('');
      }

      if (selected.has('attendees') && attendees.length > 0) {
        parts.push('=== ATTENDEES ===');
        attendees.forEach(a => {
          parts.push(`• ${a.attendee_name} (${a.attendee_role || 'N/A'})`);
        });
      }

      const blob = new Blob([parts.join('\n')], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `IEP_Meeting_Packet_${meeting?.meeting_date || 'draft'}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Meeting packet downloaded');
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate packet');
    } finally {
      setGenerating(false);
    }
  };

  const selectedCount = selected.size;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Meeting Packet Builder
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{selectedCount} sections</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">Select which sections to include in your meeting packet.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {sections.map(s => (
            <div key={s.key} className="flex items-center gap-2.5 p-2 rounded-md border hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => toggle(s.key)}>
              <Checkbox checked={selected.has(s.key)} className="h-3.5 w-3.5" />
              <span className="text-xs flex-1">{s.label}</span>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0">{s.count}</Badge>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleGenerate} disabled={generating || selectedCount === 0} className="gap-1.5">
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Generate Meeting Packet
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
