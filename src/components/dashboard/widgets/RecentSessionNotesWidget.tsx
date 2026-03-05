import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function RecentSessionNotesWidget() {
  const { user } = useAuth();

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['dashboard-recent-notes', user?.id],
    enabled: !!user,
    refetchInterval: 120_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('session_notes')
        .select('id, created_at, status, session_id, sessions(student_id, students(first_name, last_name))')
        .eq('author_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(6);
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-10 rounded-md bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
        <FileText className="w-8 h-8" />
        <p className="text-xs">No recent notes</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {notes.map((note: any) => {
        const student = note.sessions?.students;
        const name = student ? `${student.first_name} ${student.last_name?.[0] || ''}.` : 'Unknown';
        const statusColor = note.status === 'finalized' ? 'bg-emerald-500' : note.status === 'draft' ? 'bg-amber-500' : 'bg-muted-foreground';

        return (
          <div key={note.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusColor}`} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{name}</p>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="w-2.5 h-2.5" />
                {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
              </div>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">{note.status}</span>
          </div>
        );
      })}
    </div>
  );
}
