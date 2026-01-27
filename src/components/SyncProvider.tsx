import { useEffect, useRef, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useDataStore } from '@/store/dataStore';
import { Student, Behavior, BehaviorGoal, Session } from '@/types/behavior';
import { Json } from '@/integrations/supabase/types';
import { toast } from 'sonner';

interface SyncProviderProps {
  children: ReactNode;
}

export function SyncProvider({ children }: SyncProviderProps) {
  const { user } = useAuth();
  const hasFetched = useRef(false);
  const previousStudentsRef = useRef<string>('');
  const previousGoalsRef = useRef<string>('');
  const previousSessionsRef = useRef<string>('');
  
  const students = useDataStore((state) => state.students);
  const behaviorGoals = useDataStore((state) => state.behaviorGoals);
  const sessions = useDataStore((state) => state.sessions);

  // Load students from Supabase
  useEffect(() => {
    if (!user || hasFetched.current) return;
    
    const loadData = async () => {
      try {
        // Load students
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('*')
          .order('created_at', { ascending: true });

        if (studentsError) throw studentsError;

        if (studentsData) {
          const mappedStudents: Student[] = studentsData.map((s) => ({
            id: s.id,
            name: s.name,
            color: s.color,
            behaviors: (s.behaviors as unknown as Behavior[]) || [],
            customAntecedents: (s.custom_antecedents as unknown as string[]) || [],
            customConsequences: (s.custom_consequences as unknown as string[]) || [],
            isArchived: s.is_archived,
          }));

          const goals = studentsData.flatMap((s) => {
            const studentGoals = (s.goals as unknown as BehaviorGoal[]) || [];
            return studentGoals.map(g => ({ ...g, studentId: s.id }));
          });

          useDataStore.setState({ 
            students: mappedStudents,
            behaviorGoals: goals,
          });

          // Update refs to prevent immediate re-sync
          previousStudentsRef.current = JSON.stringify(mappedStudents);
          previousGoalsRef.current = JSON.stringify(goals);
        }

        // Load sessions
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('sessions')
          .select('*')
          .order('start_time', { ascending: false });

        if (sessionsError) throw sessionsError;

        if (sessionsData && sessionsData.length > 0) {
          const { data: sessionDataEntries } = await supabase
            .from('session_data')
            .select('*')
            .order('timestamp', { ascending: true });

          const mappedSessions: Session[] = sessionsData.map((session) => {
            const entries = sessionDataEntries?.filter(e => e.session_id === session.id) || [];
            
            return {
              id: session.id,
              date: new Date(session.start_time),
              notes: session.name || '',
              studentIds: session.student_ids || [],
              sessionLengthMinutes: session.session_length_minutes,
              abcEntries: entries
                .filter(e => e.event_type === 'abc')
                .map(e => ({
                  id: e.id,
                  studentId: e.student_id,
                  behaviorId: e.behavior_id,
                  antecedent: (e.abc_data as any)?.antecedent || '',
                  behavior: (e.abc_data as any)?.behavior || '',
                  consequence: (e.abc_data as any)?.consequence || '',
                  frequencyCount: (e.abc_data as any)?.frequencyCount || 1,
                  timestamp: new Date(e.timestamp),
                  sessionId: e.session_id,
                })),
              frequencyEntries: entries
                .filter(e => e.event_type === 'frequency')
                .map(e => ({
                  id: e.id,
                  studentId: e.student_id,
                  behaviorId: e.behavior_id,
                  count: (e.abc_data as any)?.count || 1,
                  timestamp: new Date(e.timestamp),
                  timestamps: (e.abc_data as any)?.timestamps?.map((t: string) => new Date(t)) || [],
                  sessionId: e.session_id,
                })),
              durationEntries: entries
                .filter(e => e.event_type === 'duration')
                .map(e => ({
                  id: e.id,
                  studentId: e.student_id,
                  behaviorId: e.behavior_id,
                  duration: e.duration_seconds || 0,
                  startTime: new Date(e.timestamp),
                  endTime: (e.abc_data as any)?.endTime ? new Date((e.abc_data as any).endTime) : undefined,
                  sessionId: e.session_id,
                })),
              intervalEntries: entries
                .filter(e => e.event_type === 'interval')
                .map(e => ({
                  id: e.id,
                  studentId: e.student_id,
                  behaviorId: e.behavior_id,
                  intervalNumber: e.interval_index || 0,
                  occurred: (e.abc_data as any)?.occurred || false,
                  timestamp: new Date(e.timestamp),
                  voided: (e.abc_data as any)?.voided,
                  voidReason: (e.abc_data as any)?.voidReason,
                  sessionId: e.session_id,
                })),
            };
          });

          useDataStore.setState({ sessions: mappedSessions });
          previousSessionsRef.current = JSON.stringify(mappedSessions.map(s => s.id));
        }

        hasFetched.current = true;
        toast.success('Data synced from cloud');
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load data from cloud');
      }
    };

    loadData();
  }, [user]);

  // Sync students to Supabase when they change
  useEffect(() => {
    if (!user || !hasFetched.current) return;
    
    const currentStudentsJson = JSON.stringify(students);
    const currentGoalsJson = JSON.stringify(behaviorGoals);
    
    // Skip if nothing changed
    if (currentStudentsJson === previousStudentsRef.current && 
        currentGoalsJson === previousGoalsRef.current) {
      return;
    }

    previousStudentsRef.current = currentStudentsJson;
    previousGoalsRef.current = currentGoalsJson;

    const syncStudents = async () => {
      try {
        // Get current student IDs in database
        const { data: existingStudents } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', user.id);

        const existingIds = new Set(existingStudents?.map(s => s.id) || []);
        const currentIds = new Set(students.map(s => s.id));

        // Delete removed students
        const deletedIds = [...existingIds].filter(id => !currentIds.has(id));
        if (deletedIds.length > 0) {
          await supabase
            .from('students')
            .delete()
            .in('id', deletedIds)
            .eq('user_id', user.id);
        }

        // Upsert all current students
        for (const student of students) {
          const studentGoals = behaviorGoals.filter(g => g.studentId === student.id);
          
          await supabase
            .from('students')
            .upsert({
              id: student.id,
              user_id: user.id,
              name: student.name,
              color: student.color,
              behaviors: student.behaviors as any,
              custom_antecedents: student.customAntecedents as any,
              custom_consequences: student.customConsequences as any,
              goals: studentGoals as any,
              is_archived: student.isArchived || false,
            }, { onConflict: 'id' });
        }
      } catch (error) {
        console.error('Error syncing students:', error);
      }
    };

    // Debounce the sync
    const timeout = setTimeout(syncStudents, 1000);
    return () => clearTimeout(timeout);
  }, [user, students, behaviorGoals]);

  // Sync sessions to Supabase when they change
  useEffect(() => {
    if (!user || !hasFetched.current) return;
    
    const currentSessionIds = JSON.stringify(sessions.map(s => s.id));
    
    // Skip if nothing changed
    if (currentSessionIds === previousSessionsRef.current) {
      return;
    }

    // Find new sessions (not in previous ref)
    const previousIds = new Set(
      previousSessionsRef.current ? JSON.parse(previousSessionsRef.current) : []
    );
    const newSessions = sessions.filter(s => !previousIds.has(s.id));
    
    previousSessionsRef.current = currentSessionIds;

    if (newSessions.length === 0) return;

    const syncSessions = async () => {
      try {
        for (const session of newSessions) {
          // Create session record
          await supabase.from('sessions').upsert({
            id: session.id,
            user_id: user.id,
            name: session.notes || 'Session',
            start_time: session.date.toISOString(),
            session_length_minutes: session.sessionLengthMinutes,
            interval_length_seconds: 15,
            student_ids: session.studentIds,
          }, { onConflict: 'id' });

          // Create session data entries
          const sessionDataEntries = [
            ...session.abcEntries.map(e => ({
              id: e.id,
              user_id: user.id,
              session_id: session.id,
              student_id: e.studentId,
              behavior_id: e.behaviorId,
              event_type: 'abc',
              timestamp: e.timestamp.toISOString(),
              abc_data: {
                antecedent: e.antecedent,
                antecedents: e.antecedents,
                behavior: e.behavior,
                behaviors: e.behaviors as unknown as Json,
                consequence: e.consequence,
                consequences: e.consequences,
                functions: e.functions,
                frequencyCount: e.frequencyCount,
                hasDuration: e.hasDuration,
                durationMinutes: e.durationMinutes,
              } as Json,
            })),
            ...session.frequencyEntries.map(e => ({
              id: e.id,
              user_id: user.id,
              session_id: session.id,
              student_id: e.studentId,
              behavior_id: e.behaviorId,
              event_type: 'frequency',
              timestamp: e.timestamp.toISOString(),
              abc_data: {
                count: e.count,
                timestamps: e.timestamps?.map(t => t.toISOString()),
              } as Json,
            })),
            ...session.durationEntries.map(e => ({
              id: e.id,
              user_id: user.id,
              session_id: session.id,
              student_id: e.studentId,
              behavior_id: e.behaviorId,
              event_type: 'duration',
              timestamp: e.startTime.toISOString(),
              duration_seconds: e.duration,
              abc_data: {
                endTime: e.endTime?.toISOString(),
              } as Json,
            })),
            ...session.intervalEntries.map(e => ({
              id: e.id,
              user_id: user.id,
              session_id: session.id,
              student_id: e.studentId,
              behavior_id: e.behaviorId,
              event_type: 'interval',
              timestamp: e.timestamp.toISOString(),
              interval_index: e.intervalNumber,
              abc_data: {
                occurred: e.occurred,
                voided: e.voided,
                voidReason: e.voidReason,
                markedAt: e.markedAt?.toISOString(),
              } as Json,
            })),
          ];

          if (sessionDataEntries.length > 0) {
            // Insert in batches to avoid payload limits
            for (let i = 0; i < sessionDataEntries.length; i += 50) {
              const batch = sessionDataEntries.slice(i, i + 50);
              await supabase.from('session_data').upsert(batch, { onConflict: 'id' });
            }
          }
        }
      } catch (error) {
        console.error('Error syncing sessions:', error);
      }
    };

    syncSessions();
  }, [user, sessions]);

  // Reset fetch flag when user logs out
  useEffect(() => {
    if (!user) {
      hasFetched.current = false;
      previousStudentsRef.current = '';
      previousGoalsRef.current = '';
      previousSessionsRef.current = '';
    }
  }, [user]);

  return <>{children}</>;
}
