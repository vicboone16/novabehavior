import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export interface ParentThread {
  id: string;
  agency_id: string;
  student_id: string;
  thread_status: string;
  created_at: string;
  updated_at: string;
  // Joined
  student_name?: string;
  last_message?: string;
  last_message_at?: string;
  last_sender_type?: string;
  unread_count?: number;
}

export interface ParentLinkMessage {
  id: string;
  thread_id: string;
  student_id: string;
  sender_type: string; // 'teacher' | 'parent'
  sender_user_id: string | null;
  sender_label: string | null;
  body: string;
  message_type: string;
  is_read: boolean;
  created_at: string;
}

export function useParentThreads(agencyId: string | null) {
  const [threads, setThreads] = useState<ParentThread[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!agencyId) { setLoading(false); return; }
    try {
      // Get threads
      const { data: threadData } = await db
        .from('parent_link_threads')
        .select('*')
        .eq('agency_id', agencyId)
        .order('updated_at', { ascending: false });

      if (!threadData || threadData.length === 0) {
        setThreads([]);
        setLoading(false);
        return;
      }

      const studentIds = [...new Set(threadData.map((t: any) => t.student_id))];
      
      // Get student names
      const { data: students } = await db
        .from('students')
        .select('id, first_name, last_name')
        .in('id', studentIds);

      const nameMap = new Map<string, string>();
      for (const s of (students || [])) {
        nameMap.set(s.id, `${s.first_name} ${s.last_name}`);
      }

      // Get last message + unread count per thread
      const threadIds = threadData.map((t: any) => t.id);
      const { data: messages } = await db
        .from('parent_link_messages')
        .select('thread_id, body, sender_type, is_read, created_at')
        .in('thread_id', threadIds)
        .order('created_at', { ascending: false });

      const lastMsgMap = new Map<string, any>();
      const unreadMap = new Map<string, number>();
      
      for (const m of (messages || [])) {
        if (!lastMsgMap.has(m.thread_id)) {
          lastMsgMap.set(m.thread_id, m);
        }
        if (m.sender_type === 'parent' && !m.is_read) {
          unreadMap.set(m.thread_id, (unreadMap.get(m.thread_id) || 0) + 1);
        }
      }

      const enriched: ParentThread[] = threadData.map((t: any) => {
        const lastMsg = lastMsgMap.get(t.id);
        return {
          ...t,
          student_name: nameMap.get(t.student_id) || 'Unknown Student',
          last_message: lastMsg?.body || null,
          last_message_at: lastMsg?.created_at || t.updated_at,
          last_sender_type: lastMsg?.sender_type || null,
          unread_count: unreadMap.get(t.id) || 0,
        };
      });

      setThreads(enriched);
    } catch (err) {
      console.error('useParentThreads error:', err);
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { threads, loading, refresh };
}

export function useParentThreadMessages(threadId: string | null) {
  const [messages, setMessages] = useState<ParentLinkMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!threadId) { setMessages([]); setLoading(false); return; }
    try {
      const { data } = await db
        .from('parent_link_messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });
      setMessages(data || []);

      // Mark parent messages as read
      await db
        .from('parent_link_messages')
        .update({ is_read: true })
        .eq('thread_id', threadId)
        .eq('sender_type', 'parent')
        .eq('is_read', false);
    } catch (err) {
      console.error('useParentThreadMessages error:', err);
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { messages, loading, refresh };
}

export async function sendTeacherMessage(
  threadId: string,
  studentId: string,
  agencyId: string,
  userId: string,
  senderLabel: string,
  body: string,
  messageType: string = 'text'
) {
  const { data, error } = await db.from('parent_link_messages').insert({
    thread_id: threadId,
    student_id: studentId,
    agency_id: agencyId,
    sender_type: 'teacher',
    sender_user_id: userId,
    sender_label: senderLabel,
    body,
    message_type: messageType,
    is_read: true,
  }).select().single();

  if (error) throw error;

  // Update thread timestamp
  await db.from('parent_link_threads')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', threadId);

  return data;
}
