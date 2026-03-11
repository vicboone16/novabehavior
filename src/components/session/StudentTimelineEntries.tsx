import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Clock, Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TimelineEntry {
  id: string;
  entry_time: string;
  content: string;
  entry_type: string;
  session_id: string | null;
  user_id: string;
  created_at: string;
}

interface StudentTimelineEntriesProps {
  studentId: string;
  sessionId?: string | null;
  maxHeight?: string;
}

export function StudentTimelineEntries({ studentId, sessionId, maxHeight = '200px' }: StudentTimelineEntriesProps) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = async () => {
    let query = supabase
      .from('student_timeline_entries')
      .select('*')
      .eq('student_id', studentId)
      .order('entry_time', { ascending: false })
      .limit(50);

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    const { data } = await query;
    setEntries(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchEntries();

    // Subscribe to new entries
    const channel = supabase
      .channel(`timeline-${studentId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'student_timeline_entries',
        filter: `student_id=eq.${studentId}`,
      }, () => fetchEntries())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [studentId, sessionId]);

  const handleDelete = async (id: string) => {
    await supabase.from('student_timeline_entries').delete().eq('id', id);
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  if (loading) return <p className="text-xs text-muted-foreground p-2">Loading timeline...</p>;
  if (entries.length === 0) return null;

  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
        <Clock className="w-3 h-3" /> Event Timeline
        <Badge variant="outline" className="text-[10px] ml-1">{entries.length}</Badge>
      </p>
      <ScrollArea style={{ maxHeight }}>
        <div className="space-y-1.5">
          {entries.map(entry => (
            <div key={entry.id} className="flex items-start gap-2 rounded-md border border-border/50 bg-muted/30 p-2 text-sm group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    {format(new Date(entry.entry_time), 'MMM d, h:mm a')}
                  </span>
                  {entry.session_id && (
                    <Badge variant="secondary" className="text-[9px] h-4">Session</Badge>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap">{entry.content}</p>
              </div>
              {entry.user_id === user?.id && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                  onClick={() => handleDelete(entry.id)}
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
