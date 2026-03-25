import { useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, GraduationCap } from 'lucide-react';
import type { ParentLinkMessage } from '@/hooks/useParentMessaging';
import { format } from 'date-fns';

interface Props {
  messages: ParentLinkMessage[];
  loading: boolean;
  studentName: string;
}

export function ParentThreadConversation({ messages, loading, studentName }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
        <GraduationCap className="w-8 h-8 opacity-30" />
        <p className="text-sm">No messages yet with {studentName}'s family.</p>
        <p className="text-xs">Send the first update below.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.map((msg) => {
        const isTeacher = msg.sender_type === 'teacher';
        return (
          <div key={msg.id} className={`flex ${isTeacher ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] space-y-1`}>
              <div className={`rounded-2xl px-4 py-2.5 ${
                isTeacher 
                  ? 'bg-primary text-primary-foreground rounded-br-md' 
                  : 'bg-muted text-foreground rounded-bl-md'
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>
              </div>
              <div className={`flex items-center gap-1.5 px-1 ${isTeacher ? 'justify-end' : 'justify-start'}`}>
                {!isTeacher && <User className="w-2.5 h-2.5 text-muted-foreground" />}
                <span className="text-[10px] text-muted-foreground">
                  {msg.sender_label || (isTeacher ? 'Teacher' : 'Parent')}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                </span>
                {msg.message_type === 'insight' && (
                  <Badge variant="outline" className="text-[9px] h-3.5 border-primary/30 text-primary">insight</Badge>
                )}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
