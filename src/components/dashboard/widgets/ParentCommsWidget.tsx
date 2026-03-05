import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MessageSquare, Send, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function ParentCommsWidget() {
  const { user } = useAuth();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['dashboard-parent-comms', user?.id],
    enabled: !!user,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('messages' as any)
        .select('id, content, created_at, sender_id, recipient_id, read_at')
        .or(`sender_id.eq.${user!.id},recipient_id.eq.${user!.id}`)
        .order('created_at', { ascending: false })
        .limit(8);
      return (data as any[]) || [];
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

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
        <MessageSquare className="w-8 h-8" />
        <p className="text-xs">No recent messages</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {messages.map((msg: any) => {
        const isSent = msg.sender_id === user?.id;
        const isUnread = !isSent && !msg.read_at;

        return (
          <div key={msg.id} className={`flex items-start gap-2 p-2 rounded-md transition-colors ${isUnread ? 'bg-primary/5 border border-primary/20' : 'bg-muted/30 hover:bg-muted/50'}`}>
            <div className="shrink-0 mt-0.5">
              {isSent ? <Send className="w-3 h-3 text-muted-foreground" /> : <MessageSquare className="w-3 h-3 text-primary" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium truncate">{isSent ? 'You' : 'Parent'}</span>
                {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
              </div>
              <p className="text-[10px] text-muted-foreground line-clamp-1">{msg.content}</p>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                <Clock className="w-2.5 h-2.5" />
                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
