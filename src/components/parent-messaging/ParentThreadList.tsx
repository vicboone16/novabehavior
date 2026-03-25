import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MessageCircle, Clock, AlertCircle, Star, Filter } from 'lucide-react';
import type { ParentThread } from '@/hooks/useParentMessaging';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  threads: ParentThread[];
  selectedId: string | null;
  onSelect: (thread: ParentThread) => void;
}

type FilterType = 'all' | 'unread' | 'awaiting' | 'resolved';

export function ParentThreadList({ threads, selectedId, onSelect }: Props) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  const filtered = threads.filter(t => {
    if (search && !t.student_name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'unread' && (t.unread_count || 0) === 0) return false;
    if (filter === 'awaiting' && t.last_sender_type !== 'parent') return false;
    if (filter === 'resolved' && t.thread_status !== 'resolved') return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full border-r border-border bg-card">
      {/* Header */}
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-sm text-foreground">Parent Messages</h2>
          {threads.some(t => (t.unread_count || 0) > 0) && (
            <Badge className="ml-auto text-[10px] h-5">
              {threads.reduce((s, t) => s + (t.unread_count || 0), 0)} new
            </Badge>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
          <SelectTrigger className="h-7 text-xs">
            <Filter className="w-3 h-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Threads</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
            <SelectItem value="awaiting">Awaiting Reply</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground">
            No threads found.
          </div>
        ) : (
          filtered.map(thread => {
            const isSelected = selectedId === thread.id;
            const hasUnread = (thread.unread_count || 0) > 0;
            const isAwaiting = thread.last_sender_type === 'parent';

            return (
              <button
                key={thread.id}
                onClick={() => onSelect(thread)}
                className={`w-full text-left p-3 border-b border-border/50 transition-colors hover:bg-muted/50 ${
                  isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-sm truncate ${hasUnread ? 'font-bold text-foreground' : 'font-medium text-foreground'}`}>
                        {thread.student_name}
                      </span>
                      {hasUnread && (
                        <Badge className="h-4 w-4 p-0 flex items-center justify-center text-[9px] rounded-full">
                          {thread.unread_count}
                        </Badge>
                      )}
                    </div>
                    {thread.last_message && (
                      <p className={`text-xs truncate mt-0.5 ${hasUnread ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {thread.last_sender_type === 'teacher' ? 'You: ' : ''}
                        {thread.last_message}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px] text-muted-foreground">
                      {thread.last_message_at && formatDistanceToNow(new Date(thread.last_message_at), { addSuffix: false })}
                    </span>
                    {isAwaiting && (
                      <Badge variant="outline" className="text-[9px] h-4 gap-0.5 border-amber-500/50 text-amber-600">
                        <Clock className="w-2.5 h-2.5" />
                        Reply
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
