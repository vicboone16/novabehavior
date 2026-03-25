import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAgencyContext } from '@/hooks/useAgencyContext';
import { useParentThreads, useParentThreadMessages, sendTeacherMessage } from '@/hooks/useParentMessaging';
import { ParentThreadList } from '@/components/parent-messaging/ParentThreadList';
import { ParentThreadConversation } from '@/components/parent-messaging/ParentThreadConversation';
import { ParentMessageComposer } from '@/components/parent-messaging/ParentMessageComposer';
import { ParentInsightModal } from '@/components/parent-messaging/ParentInsightModal';
import { StudentContextCard } from '@/components/parent-messaging/StudentContextCard';
import { Button } from '@/components/ui/button';
import { Loader2, MessageCircle, Lightbulb, CheckCircle2, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { ParentThread } from '@/hooks/useParentMessaging';

const db = supabase as any;

export default function ParentMessages() {
  const { user, profile } = useAuth();
  const { selectedAgencyId } = useAgencyContext();
  const { threads, loading: threadsLoading, refresh: refreshThreads } = useParentThreads(selectedAgencyId);
  const [selectedThread, setSelectedThread] = useState<ParentThread | null>(null);
  const { messages, loading: msgsLoading, refresh: refreshMsgs } = useParentThreadMessages(selectedThread?.id || null);
  const { toast } = useToast();

  const senderLabel = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Teacher' : 'Teacher';

  const handleSelectThread = useCallback((thread: ParentThread) => {
    setSelectedThread(thread);
  }, []);

  const handleSendMessage = useCallback(async (body: string, messageType?: string) => {
    if (!selectedThread || !user) return;
    try {
      await sendTeacherMessage(
        selectedThread.id,
        selectedThread.student_id,
        selectedThread.agency_id,
        user.id,
        senderLabel,
        body,
        messageType
      );
      refreshMsgs();
      refreshThreads();
    } catch (err: any) {
      toast({ title: 'Send failed', description: err.message, variant: 'destructive' });
    }
  }, [selectedThread, user, senderLabel, refreshMsgs, refreshThreads, toast]);

  const handleMarkResolved = useCallback(async () => {
    if (!selectedThread) return;
    await db.from('parent_link_threads').update({ thread_status: 'resolved' }).eq('id', selectedThread.id);
    toast({ title: 'Marked as resolved' });
    refreshThreads();
  }, [selectedThread, refreshThreads, toast]);

  if (threadsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex bg-background">
      {/* Left: Thread List */}
      <div className="w-72 shrink-0 flex flex-col max-md:hidden">
        <ParentThreadList
          threads={threads}
          selectedId={selectedThread?.id || null}
          onSelect={handleSelectThread}
        />
      </div>

      {/* Center: Conversation */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-border">
        {selectedThread ? (
          <>
            {/* Thread header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card">
              <div>
                <h3 className="font-semibold text-sm text-foreground">{selectedThread.student_name}'s Family</h3>
                <p className="text-[10px] text-muted-foreground capitalize">{selectedThread.thread_status}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <ParentInsightModal
                  studentId={selectedThread.student_id}
                  studentName={selectedThread.student_name || ''}
                  threadId={selectedThread.id}
                  onCreated={() => { refreshMsgs(); refreshThreads(); }}
                >
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                    <Lightbulb className="w-3 h-3" />
                    Insight
                  </Button>
                </ParentInsightModal>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-7 w-7">
                      <MoreVertical className="w-3.5 h-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleMarkResolved} className="gap-2 text-xs">
                      <CheckCircle2 className="w-3 h-3" />
                      Mark Resolved
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Messages */}
            <ParentThreadConversation
              messages={messages}
              loading={msgsLoading}
              studentName={selectedThread.student_name || ''}
            />

            {/* Composer */}
            <ParentMessageComposer
              onSend={handleSendMessage}
              studentName={selectedThread.student_name || ''}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <MessageCircle className="w-10 h-10 opacity-20" />
            <div className="text-center">
              <p className="text-sm font-medium">Select a conversation</p>
              <p className="text-xs">Choose a student thread to view parent messages</p>
            </div>
          </div>
        )}
      </div>

      {/* Right: Student Context */}
      {selectedThread && (
        <div className="w-56 shrink-0 border-l border-border bg-card overflow-y-auto max-lg:hidden">
          <StudentContextCard
            studentId={selectedThread.student_id}
            studentName={selectedThread.student_name || ''}
          />
        </div>
      )}

      {/* Mobile thread list */}
      {!selectedThread && (
        <div className="md:hidden flex-1">
          <ParentThreadList
            threads={threads}
            selectedId={null}
            onSelect={handleSelectThread}
          />
        </div>
      )}
    </div>
  );
}
