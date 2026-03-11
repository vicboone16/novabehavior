import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, School, User, ClipboardCheck, Users } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  meeting: any;
  checklistItems: any[];
  attendees: any[];
}

const TYPE_LABELS: Record<string, string> = {
  annual_review: 'Annual Review',
  triennial: 'Triennial',
  amendment: 'Amendment',
  initial: 'Initial',
  transition: 'Transition',
};

export function IEPMeetingContextSection({ meeting, checklistItems, attendees }: Props) {
  if (!meeting) return null;

  const completedChecklist = checklistItems.filter(i => i.is_complete).length;
  const totalChecklist = checklistItems.length;
  const checklistPct = totalChecklist > 0 ? Math.round((completedChecklist / totalChecklist) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {/* Meeting Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Meeting Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{meeting.meeting_date ? format(new Date(meeting.meeting_date), 'MMM d, yyyy') : 'Not set'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              {TYPE_LABELS[meeting.meeting_type] || meeting.meeting_type}
            </Badge>
            <Badge variant={meeting.status === 'finalized' ? 'default' : 'secondary'} className="text-[10px]">
              {meeting.status}
            </Badge>
          </div>
          {meeting.meeting_title && (
            <p className="text-xs text-muted-foreground">{meeting.meeting_title}</p>
          )}
        </CardContent>
      </Card>

      {/* School Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">School Context</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {meeting.school_name && (
            <div className="flex items-center gap-2 text-sm">
              <School className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{meeting.school_name}</span>
            </div>
          )}
          {meeting.grade_level && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground text-xs">Grade:</span>
              <span className="text-sm">{meeting.grade_level}</span>
            </div>
          )}
          {meeting.case_manager_name && (
            <div className="flex items-center gap-2 text-sm">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{meeting.case_manager_name}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Readiness */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Readiness</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Checklist</span>
              <span className="text-xs font-medium">{completedChecklist}/{totalChecklist}</span>
            </div>
            <Progress value={checklistPct} className="h-1.5" />
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{attendees.length} attendees</span>
            </div>
            <div className="flex items-center gap-1">
              <ClipboardCheck className="w-3 h-3" />
              <span>{meeting.recommendation_count || 0} recs</span>
            </div>
          </div>
          {meeting.readiness_percent != null && (
            <Badge variant={meeting.readiness_percent >= 80 ? 'default' : 'secondary'} className="text-[10px]">
              {meeting.readiness_percent}% ready
            </Badge>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
