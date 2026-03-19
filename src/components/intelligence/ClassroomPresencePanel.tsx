import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserCheck, UserX, Clock } from 'lucide-react';
import { useClassroomPresence } from '@/hooks/useBeaconCoreData';
import { formatDistanceToNow } from 'date-fns';

interface ClassroomPresencePanelProps {
  classroomId: string;
  studentNames?: Map<string, string>;
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; bg: string; label: string }> = {
  present: { icon: <UserCheck className="w-3 h-3" />, bg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400', label: 'Present' },
  absent: { icon: <UserX className="w-3 h-3" />, bg: 'bg-red-500/15 text-red-700 dark:text-red-400', label: 'Absent' },
  with_therapist: { icon: <Clock className="w-3 h-3" />, bg: 'bg-blue-500/15 text-blue-700 dark:text-blue-400', label: 'With Therapist' },
  late_arrival: { icon: <Clock className="w-3 h-3" />, bg: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400', label: 'Late Arrival' },
  early_departure: { icon: <Clock className="w-3 h-3" />, bg: 'bg-orange-500/15 text-orange-700 dark:text-orange-400', label: 'Early Departure' },
};

export function ClassroomPresencePanel({ classroomId, studentNames }: ClassroomPresencePanelProps) {
  const { records, loading } = useClassroomPresence(classroomId);

  if (loading) return null;

  const presentCount = records.filter(r => r.status === 'present').length;
  const absentCount = records.filter(r => r.status === 'absent').length;

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-primary" />
          Student Presence
          <Badge variant="secondary" className="ml-auto text-xs">
            {presentCount} present · {absentCount} absent
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="py-0 pb-3 px-4">
        {records.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No presence data recorded today</p>
        ) : (
          <div className="space-y-1 max-h-[200px] overflow-y-auto">
            {records.map(r => {
              const config = STATUS_CONFIG[r.status] || STATUS_CONFIG.present;
              return (
                <div key={r.student_id} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                  <span className="text-sm font-medium truncate">
                    {studentNames?.get(r.student_id) || r.student_id.slice(0, 8)}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge className={`${config.bg} text-[10px] gap-1`}>
                      {config.icon}
                      {config.label}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(r.changed_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
