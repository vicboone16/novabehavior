import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useDataStore } from '@/store/dataStore';
import { Student, Behavior, BehaviorGoal, Session } from '@/types/behavior';
import { Json } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { RealtimeChannel } from '@supabase/supabase-js';

interface SyncContextType {
  isSyncing: boolean;
  isLoading: boolean;
  lastSyncTime: Date | null;
  syncNow: () => Promise<void>;
  reloadFromCloud: () => Promise<void>;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

interface SyncProviderProps {
  children: ReactNode;
}

export function SyncProvider({ children }: SyncProviderProps) {
  const { user } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  
  const hasFetched = useRef(false);
  const previousStudentsRef = useRef<string>('');
  const previousGoalsRef = useRef<string>('');
  const previousSessionsRef = useRef<string>('');
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);
  const isProcessingRealtimeRef = useRef(false);
  
  const students = useDataStore((state) => state.students);
  const behaviorGoals = useDataStore((state) => state.behaviorGoals);
  const sessions = useDataStore((state) => state.sessions);
  const sessionNotes = useDataStore((state) => state.sessionNotes);
  
  // Live session data that needs real-time sync
  const frequencyEntries = useDataStore((state) => state.frequencyEntries);
  const durationEntries = useDataStore((state) => state.durationEntries);
  const intervalEntries = useDataStore((state) => state.intervalEntries);
  const abcEntries = useDataStore((state) => state.abcEntries);
  const currentSessionId = useDataStore((state) => state.currentSessionId);
  const sessionStartTime = useDataStore((state) => state.sessionStartTime);
  const selectedStudentIds = useDataStore((state) => state.selectedStudentIds);

  const clearLocalCache = useCallback(() => {
    // On some mobile browsers / privacy modes, localStorage can throw.
    try {
      localStorage.removeItem('behavior-data-storage');
    } catch (e) {
      console.warn('[Sync] Unable to clear local cache:', e);
    }
  }, []);

  // Load all data from Supabase
  const loadData = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    setSyncStatus('syncing');
    
    try {
      // Clear cached students before loading fresh data from cloud
      // This prevents stale localStorage data from overriding cloud data
      console.log('[Sync] Loading fresh data from cloud for user:', user.id);
      
      // Load user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // Load students - fetch ALL students the user has access to
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: true });

      if (studentsError) {
        console.error('[Sync] Error loading students:', studentsError);
        throw studentsError;
      }
      
      console.log('[Sync] Loaded', studentsData?.length || 0, 'students from cloud');

      if (studentsData) {
        const mappedStudents: Student[] = studentsData.map((s: any) => ({
          id: s.id,
          name: s.name,
          color: s.color,
          behaviors: (s.behaviors as unknown as Behavior[]) || [],
          customAntecedents: (s.custom_antecedents as unknown as string[]) || [],
          customConsequences: (s.custom_consequences as unknown as string[]) || [],
          isArchived: s.is_archived,
          archivedAt: s.archived_at ? new Date(s.archived_at) : undefined,
          // Extended profile fields
          dateOfBirth: s.date_of_birth ? new Date(s.date_of_birth) : undefined,
          grade: s.grade || undefined,
          school: s.school || undefined,
          caseTypes: (s.case_types as unknown as import('@/types/behavior').CaseType[]) || [],
          assessmentModeEnabled: s.assessment_mode_enabled || false,
          // FBA/Assessment data
          fbaWorkflowProgress: s.fba_workflow_progress ? {
            ...s.fba_workflow_progress,
            updatedAt: s.fba_workflow_progress.updatedAt ? new Date(s.fba_workflow_progress.updatedAt) : new Date(),
          } : undefined,
          fbaFindings: s.fba_findings ? {
            ...s.fba_findings,
            createdAt: s.fba_findings.createdAt ? new Date(s.fba_findings.createdAt) : new Date(),
            updatedAt: s.fba_findings.updatedAt ? new Date(s.fba_findings.updatedAt) : new Date(),
          } : undefined,
          bipData: s.bip_data ? {
            ...s.bip_data,
            createdAt: s.bip_data.createdAt ? new Date(s.bip_data.createdAt) : new Date(),
            updatedAt: s.bip_data.updatedAt ? new Date(s.bip_data.updatedAt) : new Date(),
            reviewDate: s.bip_data.reviewDate ? new Date(s.bip_data.reviewDate) : undefined,
          } : undefined,
          // Background information for reports
          backgroundInfo: s.background_info ? {
            ...s.background_info,
            referralDate: s.background_info.referralDate ? new Date(s.background_info.referralDate) : undefined,
            updatedAt: s.background_info.updatedAt ? new Date(s.background_info.updatedAt) : undefined,
          } : undefined,
          // Notes and assessments
          narrativeNotes: ((s.narrative_notes as unknown as import('@/types/behavior').NarrativeNote[]) || []).map((n: any) => ({
            ...n,
            timestamp: n.timestamp ? new Date(n.timestamp) : new Date(),
          })),
          indirectAssessments: ((s.indirect_assessments as unknown as import('@/types/behavior').IndirectAssessmentResult[]) || []).map((a: any) => ({
            ...a,
            completedAt: a.completedAt ? new Date(a.completedAt) : new Date(),
          })),
          documents: ((s.documents as unknown as import('@/types/behavior').StudentDocument[]) || []).map((d: any) => ({
            ...d,
            uploadedAt: d.uploadedAt ? new Date(d.uploadedAt) : new Date(),
          })),
          // Historical data for frequency/duration entries
          historicalData: s.historical_data ? {
            frequencyEntries: ((s.historical_data as any).frequencyEntries || []).map((e: any) => ({
              ...e,
              timestamp: e.timestamp ? new Date(e.timestamp) : new Date(),
            })),
            durationEntries: ((s.historical_data as any).durationEntries || []).map((e: any) => ({
              ...e,
              timestamp: e.timestamp ? new Date(e.timestamp) : new Date(),
            })),
          } : { frequencyEntries: [], durationEntries: [] },
        }));

        const goals = studentsData.flatMap((s) => {
          const studentGoals = (s.goals as unknown as BehaviorGoal[]) || [];
          return studentGoals.map(g => ({ ...g, studentId: s.id }));
        });

        // Hydrate historical frequency entries from student data
        const historicalFrequencyEntries = mappedStudents.flatMap((student) => {
          const entries = student.historicalData?.frequencyEntries || [];
          return entries.map((e) => ({
            id: e.id,
            studentId: student.id,
            behaviorId: e.behaviorId,
            count: e.count,
            timestamp: e.timestamp,
            timestamps: Array(e.count).fill(e.timestamp),
            observationDurationMinutes: e.observationDurationMinutes,
            isHistorical: true,
          }));
        });

        // Hydrate historical duration entries from student data
        const historicalDurationEntries = mappedStudents.flatMap((student) => {
          const entries = student.historicalData?.durationEntries || [];
          return entries.map((e) => ({
            id: e.id,
            studentId: student.id,
            behaviorId: e.behaviorId,
            duration: e.durationSeconds,
            startTime: e.timestamp,
            endTime: new Date(new Date(e.timestamp).getTime() + e.durationSeconds * 1000),
          }));
        });

        // Get current live session data to preserve during reload
        const currentState = useDataStore.getState();
        const currentSessionId = currentState.currentSessionId;
        
        // Filter out historical entries that might already be in the store
        // and preserve any live session entries that aren't historical
        const liveFrequency = currentState.frequencyEntries.filter(e => 
          !e.isHistorical && e.sessionId === currentSessionId
        );
        const liveDuration = currentState.durationEntries.filter(e => 
          e.sessionId === currentSessionId
        );
        
        // Merge historical entries with live session entries
        const mergedFrequency = [
          ...historicalFrequencyEntries,
          ...liveFrequency.filter(live => 
            !historicalFrequencyEntries.some(h => h.id === live.id)
          ),
        ];
        const mergedDuration = [
          ...historicalDurationEntries,
          ...liveDuration.filter(live => 
            !historicalDurationEntries.some(h => h.id === live.id)
          ),
        ];
        
        useDataStore.setState({ 
          students: mappedStudents,
          behaviorGoals: goals,
          frequencyEntries: mergedFrequency,
          durationEntries: mergedDuration,
        });

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

        console.log('[Sync] Loaded', sessionDataEntries?.length || 0, 'session_data entries from cloud');

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

        // CRITICAL: Also populate the top-level entry arrays from ALL session data
        // This ensures the UI can access the data from any session, not just active ones
        if (sessionDataEntries && sessionDataEntries.length > 0) {
          const allFrequencyEntries = sessionDataEntries
            .filter(e => e.event_type === 'frequency')
            .map(e => ({
              id: e.id,
              studentId: e.student_id,
              behaviorId: e.behavior_id,
              count: (e.abc_data as any)?.count || 1,
              timestamp: new Date(e.timestamp),
              timestamps: (e.abc_data as any)?.timestamps?.map((t: string) => new Date(t)) || [],
              sessionId: e.session_id,
            }));

          const allDurationEntries = sessionDataEntries
            .filter(e => e.event_type === 'duration')
            .map(e => ({
              id: e.id,
              studentId: e.student_id,
              behaviorId: e.behavior_id,
              duration: e.duration_seconds || 0,
              startTime: new Date(e.timestamp),
              endTime: (e.abc_data as any)?.endTime ? new Date((e.abc_data as any).endTime) : undefined,
              sessionId: e.session_id,
            }));

          const allIntervalEntries = sessionDataEntries
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
            }));

          const allAbcEntries = sessionDataEntries
            .filter(e => e.event_type === 'abc')
            .map(e => ({
              id: e.id,
              studentId: e.student_id,
              behaviorId: e.behavior_id,
              antecedent: (e.abc_data as any)?.antecedent || '',
              antecedents: (e.abc_data as any)?.antecedents,
              behavior: (e.abc_data as any)?.behavior || '',
              behaviors: (e.abc_data as any)?.behaviors,
              consequence: (e.abc_data as any)?.consequence || '',
              consequences: (e.abc_data as any)?.consequences,
              functions: (e.abc_data as any)?.functions,
              frequencyCount: (e.abc_data as any)?.frequencyCount || 1,
              hasDuration: (e.abc_data as any)?.hasDuration,
              durationMinutes: (e.abc_data as any)?.durationMinutes,
              timestamp: new Date(e.timestamp),
              sessionId: e.session_id,
            }));

          // Merge cloud session data with any existing historical data
          const currentState = useDataStore.getState();
          const historicalFrequency = currentState.frequencyEntries.filter(e => e.isHistorical);
          const historicalDuration = currentState.durationEntries.filter(e => !e.sessionId);

          // Deduplicate by ID
          const mergedFrequency = [
            ...historicalFrequency,
            ...allFrequencyEntries.filter(cloud => 
              !historicalFrequency.some(h => h.id === cloud.id)
            ),
          ];
          const mergedDuration = [
            ...historicalDuration,
            ...allDurationEntries.filter(cloud => 
              !historicalDuration.some(h => h.id === cloud.id)
            ),
          ];

          console.log('[Sync] Populating UI store with', mergedFrequency.length, 'frequency,', 
            mergedDuration.length, 'duration,', allIntervalEntries.length, 'interval,', 
            allAbcEntries.length, 'ABC entries');

          useDataStore.setState({ 
            sessions: mappedSessions,
            frequencyEntries: mergedFrequency,
            durationEntries: mergedDuration,
            intervalEntries: allIntervalEntries,
            abcEntries: allAbcEntries,
          });
        } else {
          useDataStore.setState({ sessions: mappedSessions });
        }

        previousSessionsRef.current = JSON.stringify(mappedSessions.map(s => s.id));
      }

      // Load LIVE session data (active session from another device)
      // Look for sessions with status = 'active' to get live data
      const { data: activeSessionData } = await supabase
        .from('sessions')
        .select('id, student_ids, start_time')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeSessionData) {
        console.log('[Sync] Found active session, loading live data...');
        
        // Load live session data entries
        const { data: liveEntries } = await supabase
          .from('session_data')
          .select('*')
          .eq('session_id', activeSessionData.id)
          .order('timestamp', { ascending: true });

        if (liveEntries && liveEntries.length > 0) {
          console.log('[Sync] Loading', liveEntries.length, 'live session entries');
          
          // Map to live frequency entries
          const liveFrequency = liveEntries
            .filter(e => e.event_type === 'frequency')
            .map(e => ({
              id: e.id,
              studentId: e.student_id,
              behaviorId: e.behavior_id,
              count: (e.abc_data as any)?.count || 1,
              timestamp: new Date(e.timestamp),
              timestamps: (e.abc_data as any)?.timestamps?.map((t: string) => new Date(t)) || [],
              sessionId: e.session_id,
            }));

          // Map to live duration entries
          const liveDuration = liveEntries
            .filter(e => e.event_type === 'duration')
            .map(e => ({
              id: e.id,
              studentId: e.student_id,
              behaviorId: e.behavior_id,
              duration: e.duration_seconds || 0,
              startTime: new Date(e.timestamp),
              endTime: (e.abc_data as any)?.endTime ? new Date((e.abc_data as any).endTime) : undefined,
              sessionId: e.session_id,
            }));

          // Map to live interval entries
          const liveInterval = liveEntries
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
            }));

          // Map to live ABC entries
          const liveABC = liveEntries
            .filter(e => e.event_type === 'abc')
            .map(e => ({
              id: e.id,
              studentId: e.student_id,
              behaviorId: e.behavior_id,
              antecedent: (e.abc_data as any)?.antecedent || '',
              antecedents: (e.abc_data as any)?.antecedents,
              behavior: (e.abc_data as any)?.behavior || '',
              behaviors: (e.abc_data as any)?.behaviors,
              consequence: (e.abc_data as any)?.consequence || '',
              consequences: (e.abc_data as any)?.consequences,
              functions: (e.abc_data as any)?.functions,
              frequencyCount: (e.abc_data as any)?.frequencyCount || 1,
              hasDuration: (e.abc_data as any)?.hasDuration,
              durationMinutes: (e.abc_data as any)?.durationMinutes,
              timestamp: new Date(e.timestamp),
              sessionId: e.session_id,
            }));

          // Merge with existing entries (don't overwrite if local has more recent data)
          const currentState = useDataStore.getState();
          
          // Only load live data if local data is empty (fresh load scenario)
          if (currentState.frequencyEntries.length === 0 && 
              currentState.durationEntries.length === 0 && 
              currentState.intervalEntries.length === 0 &&
              currentState.abcEntries.length === 0) {
            
            useDataStore.setState({
              frequencyEntries: liveFrequency,
              durationEntries: liveDuration,
              intervalEntries: liveInterval,
              abcEntries: liveABC,
              currentSessionId: activeSessionData.id,
              sessionStartTime: new Date(activeSessionData.start_time),
              selectedStudentIds: activeSessionData.student_ids || [],
            });
            
            console.log('[Sync] Live session data loaded into active counters');
          } else {
            console.log('[Sync] Local data exists, skipping live data load to prevent overwrite');
          }
        }
      }

      setLastSyncTime(new Date());
      setSyncStatus('success');
      hasFetched.current = true;
    } catch (error) {
      console.error('Error loading data:', error);
      setSyncStatus('error');
      toast.error('Failed to load data from cloud');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const reloadFromCloud = useCallback(async () => {
    if (!user) return;
    
    // CRITICAL: Store current data as backup before clearing cache
    const currentStudents = useDataStore.getState().students;
    const currentFrequency = useDataStore.getState().frequencyEntries;
    const currentDuration = useDataStore.getState().durationEntries;
    const currentInterval = useDataStore.getState().intervalEntries;
    const currentABC = useDataStore.getState().abcEntries;
    const hadData = currentStudents.length > 0;
    
    clearLocalCache();
    // Ensure the next effect cycle doesn't skip load.
    hasFetched.current = false;
    
    try {
      await loadData();
      
      // Verify we got data back - if cloud returned nothing but we had data, restore it
      const newStudents = useDataStore.getState().students;
      if (hadData && newStudents.length === 0) {
        console.warn('[Sync] Cloud returned empty data but we had local data - restoring backup');
        useDataStore.setState({
          students: currentStudents,
          frequencyEntries: currentFrequency,
          durationEntries: currentDuration,
          intervalEntries: currentInterval,
          abcEntries: currentABC,
        });
        toast.error('Could not load from cloud - local data preserved');
        return;
      }
      
      // If we had live session data that wasn't in cloud, merge it back
      const newFrequency = useDataStore.getState().frequencyEntries;
      const newDuration = useDataStore.getState().durationEntries;
      const newInterval = useDataStore.getState().intervalEntries;
      const newABC = useDataStore.getState().abcEntries;
      
      // Merge live session entries that aren't in the loaded data
      const currentSessionId = useDataStore.getState().currentSessionId;
      if (currentSessionId) {
        // Merge frequency entries from current session
        const liveFrequency = currentFrequency.filter(e => 
          e.sessionId === currentSessionId && 
          !newFrequency.some(nf => nf.id === e.id)
        );
        
        const liveDuration = currentDuration.filter(e => 
          e.sessionId === currentSessionId && 
          !newDuration.some(nd => nd.id === e.id)
        );
        
        const liveInterval = currentInterval.filter(e => 
          e.sessionId === currentSessionId && 
          !newInterval.some(ni => ni.id === e.id)
        );
        
        const liveABC = currentABC.filter(e => 
          e.sessionId === currentSessionId && 
          !newABC.some(na => na.id === e.id)
        );
        
        if (liveFrequency.length > 0 || liveDuration.length > 0 || liveInterval.length > 0 || liveABC.length > 0) {
          console.log('[Sync] Restoring live session data after reload');
          useDataStore.setState({
            frequencyEntries: [...newFrequency, ...liveFrequency],
            durationEntries: [...newDuration, ...liveDuration],
            intervalEntries: [...newInterval, ...liveInterval],
            abcEntries: [...newABC, ...liveABC],
          });
        }
      }
      
      toast.success('Data refreshed from cloud');
    } catch (error) {
      console.error('[Sync] Force refresh failed:', error);
      // Restore backup data on failure
      if (hadData) {
        useDataStore.setState({
          students: currentStudents,
          frequencyEntries: currentFrequency,
          durationEntries: currentDuration,
          intervalEntries: currentInterval,
          abcEntries: currentABC,
        });
        toast.error('Refresh failed - local data preserved');
      }
    }
  }, [user, clearLocalCache, loadData]);

  // Sync all data to Supabase
  const syncToCloud = useCallback(async () => {
    if (!user) return;
    
    // CRITICAL: Never sync if we haven't loaded cloud data first
    // This prevents wiping cloud data with an empty local store
    if (!hasFetched.current) {
      console.warn('[Sync] Skipping sync - cloud data not yet loaded');
      return;
    }
    
    // Also skip if students array is empty but we know cloud has data
    // This is a safety check to prevent accidental deletion
    if (students.length === 0) {
      console.warn('[Sync] Skipping sync - local students empty, would delete cloud data');
      return;
    }
    
    setIsSyncing(true);
    setSyncStatus('syncing');
    
    try {
      // Sync students
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
        
        // Cast to any to handle extended columns not yet in auto-generated types
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
            archived_at: student.archivedAt ? new Date(student.archivedAt).toISOString() : null,
            // Extended profile fields
            date_of_birth: student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split('T')[0] : null,
            grade: student.grade || null,
            school: student.school || null,
            case_types: student.caseTypes || [],
            assessment_mode_enabled: student.assessmentModeEnabled || false,
            // FBA/Assessment data
            fba_workflow_progress: student.fbaWorkflowProgress ? {
              ...student.fbaWorkflowProgress,
              updatedAt: student.fbaWorkflowProgress.updatedAt ? new Date(student.fbaWorkflowProgress.updatedAt).toISOString() : new Date().toISOString(),
            } : null,
            fba_findings: student.fbaFindings ? {
              ...student.fbaFindings,
              createdAt: student.fbaFindings.createdAt ? new Date(student.fbaFindings.createdAt).toISOString() : new Date().toISOString(),
              updatedAt: student.fbaFindings.updatedAt ? new Date(student.fbaFindings.updatedAt).toISOString() : new Date().toISOString(),
            } : null,
            bip_data: student.bipData ? {
              ...student.bipData,
              createdAt: student.bipData.createdAt ? new Date(student.bipData.createdAt).toISOString() : new Date().toISOString(),
              updatedAt: student.bipData.updatedAt ? new Date(student.bipData.updatedAt).toISOString() : new Date().toISOString(),
              reviewDate: student.bipData.reviewDate ? new Date(student.bipData.reviewDate).toISOString() : null,
            } : null,
            // Background information for reports
            background_info: student.backgroundInfo ? {
              ...student.backgroundInfo,
              referralDate: student.backgroundInfo.referralDate ? new Date(student.backgroundInfo.referralDate).toISOString() : null,
              updatedAt: student.backgroundInfo.updatedAt ? new Date(student.backgroundInfo.updatedAt).toISOString() : new Date().toISOString(),
            } : null,
            // Notes and assessments
            narrative_notes: (student.narrativeNotes || []).map(n => ({
              ...n,
              timestamp: n.timestamp ? new Date(n.timestamp).toISOString() : new Date().toISOString(),
            })),
            indirect_assessments: (student.indirectAssessments || []).map(a => ({
              ...a,
              completedAt: a.completedAt ? new Date(a.completedAt).toISOString() : new Date().toISOString(),
            })),
            documents: (student.documents || []).map(d => ({
              ...d,
              uploadedAt: d.uploadedAt ? new Date(d.uploadedAt).toISOString() : new Date().toISOString(),
            })),
            // Historical data for frequency/duration entries
            historical_data: student.historicalData ? {
              frequencyEntries: (student.historicalData.frequencyEntries || []).map(e => ({
                ...e,
                timestamp: e.timestamp ? new Date(e.timestamp).toISOString() : new Date().toISOString(),
              })),
              durationEntries: (student.historicalData.durationEntries || []).map(e => ({
                ...e,
                timestamp: e.timestamp ? new Date(e.timestamp).toISOString() : new Date().toISOString(),
              })),
            } : { frequencyEntries: [], durationEntries: [] },
          } as any, { onConflict: 'id' });
      }

      // Sync sessions
      for (const session of sessions) {
        await supabase.from('sessions').upsert({
          id: session.id,
          user_id: user.id,
          name: session.notes || 'Session',
          start_time: new Date(session.date).toISOString(),
          session_length_minutes: session.sessionLengthMinutes,
          interval_length_seconds: 15,
          student_ids: session.studentIds,
        }, { onConflict: 'id' });

        // Sync session data entries
        const allEntries = [
          ...session.abcEntries.map(e => ({
            id: e.id,
            user_id: user.id,
            session_id: session.id,
            student_id: e.studentId,
            behavior_id: e.behaviorId,
            event_type: 'abc',
            timestamp: new Date(e.timestamp).toISOString(),
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
            timestamp: new Date(e.timestamp).toISOString(),
            abc_data: {
              count: e.count,
              timestamps: e.timestamps?.map(t => new Date(t).toISOString()),
            } as Json,
          })),
          ...session.durationEntries.map(e => ({
            id: e.id,
            user_id: user.id,
            session_id: session.id,
            student_id: e.studentId,
            behavior_id: e.behaviorId,
            event_type: 'duration',
            timestamp: new Date(e.startTime).toISOString(),
            duration_seconds: e.duration,
            abc_data: {
              endTime: e.endTime ? new Date(e.endTime).toISOString() : undefined,
            } as Json,
          })),
          ...session.intervalEntries.map(e => ({
            id: e.id,
            user_id: user.id,
            session_id: session.id,
            student_id: e.studentId,
            behavior_id: e.behaviorId,
            event_type: 'interval',
            timestamp: new Date(e.timestamp).toISOString(),
            interval_index: e.intervalNumber,
            abc_data: {
              occurred: e.occurred,
              voided: e.voided,
              voidReason: e.voidReason,
              markedAt: e.markedAt ? new Date(e.markedAt).toISOString() : undefined,
            } as Json,
          })),
        ];

        // Insert in batches
        for (let i = 0; i < allEntries.length; i += 50) {
          const batch = allEntries.slice(i, i + 50);
          await supabase.from('session_data').upsert(batch, { onConflict: 'id' });
        }
      }

      // Sync LIVE session data (current unsaved session)
      // This enables real-time sync between devices during active data collection
      const liveSessionId = currentSessionId || 'live-session';
      const hasLiveData = frequencyEntries.some(e => e.count > 0) || 
                          durationEntries.length > 0 || 
                          intervalEntries.length > 0 ||
                          abcEntries.length > 0;

      if (hasLiveData) {
        console.log('[Sync] Syncing live session data...');
        
        // Create or update the live session record
        await supabase.from('sessions').upsert({
          id: liveSessionId,
          user_id: user.id,
          name: 'Active Session',
          start_time: sessionStartTime ? new Date(sessionStartTime).toISOString() : new Date().toISOString(),
          session_length_minutes: 60,
          interval_length_seconds: 15,
          student_ids: selectedStudentIds,
          status: 'active',
        }, { onConflict: 'id' });

        // Build live session data entries
        const liveEntries = [
          ...abcEntries.map(e => ({
            id: e.id,
            user_id: user.id,
            session_id: liveSessionId,
            student_id: e.studentId,
            behavior_id: e.behaviorId,
            event_type: 'abc',
            timestamp: new Date(e.timestamp).toISOString(),
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
          ...frequencyEntries.filter(e => e.count > 0).map(e => ({
            id: e.id,
            user_id: user.id,
            session_id: liveSessionId,
            student_id: e.studentId,
            behavior_id: e.behaviorId,
            event_type: 'frequency',
            timestamp: new Date(e.timestamp).toISOString(),
            abc_data: {
              count: e.count,
              timestamps: e.timestamps?.map(t => new Date(t).toISOString()),
            } as Json,
          })),
          ...durationEntries.filter(e => e.duration > 0 || e.endTime).map(e => ({
            id: e.id,
            user_id: user.id,
            session_id: liveSessionId,
            student_id: e.studentId,
            behavior_id: e.behaviorId,
            event_type: 'duration',
            timestamp: new Date(e.startTime).toISOString(),
            duration_seconds: e.duration,
            abc_data: {
              endTime: e.endTime ? new Date(e.endTime).toISOString() : undefined,
            } as Json,
          })),
          ...intervalEntries.map(e => ({
            id: e.id,
            user_id: user.id,
            session_id: liveSessionId,
            student_id: e.studentId,
            behavior_id: e.behaviorId,
            event_type: 'interval',
            timestamp: new Date(e.timestamp).toISOString(),
            interval_index: e.intervalNumber,
            abc_data: {
              occurred: e.occurred,
              voided: e.voided,
              voidReason: e.voidReason,
              markedAt: e.markedAt ? new Date(e.markedAt).toISOString() : undefined,
            } as Json,
          })),
        ];

        // Insert live entries
        for (let i = 0; i < liveEntries.length; i += 50) {
          const batch = liveEntries.slice(i, i + 50);
          await supabase.from('session_data').upsert(batch, { onConflict: 'id' });
        }
        
        console.log('[Sync] Live session data synced:', liveEntries.length, 'entries');
      }

      previousStudentsRef.current = JSON.stringify(students);
      previousGoalsRef.current = JSON.stringify(behaviorGoals);
      previousSessionsRef.current = JSON.stringify(sessions.map(s => s.id));
      
      setLastSyncTime(new Date());
      setSyncStatus('success');
      toast.success('Data synced to cloud');
    } catch (error) {
      console.error('Error syncing to cloud:', error);
      setSyncStatus('error');
      toast.error('Failed to sync data');
    } finally {
      setIsSyncing(false);
    }
  }, [user, students, behaviorGoals, sessions, frequencyEntries, durationEntries, intervalEntries, abcEntries, currentSessionId, sessionStartTime, selectedStudentIds]);

  // Manual sync function
  const syncNow = useCallback(async () => {
    await syncToCloud();
  }, [syncToCloud]);

  // Initial load when user authenticates
  useEffect(() => {
    if (user && !hasFetched.current) {
      loadData();
    } else if (!user) {
      hasFetched.current = false;
      setIsLoading(false);
      setLastSyncTime(null);
      previousStudentsRef.current = '';
      previousGoalsRef.current = '';
      previousSessionsRef.current = '';
      
      // Cleanup realtime subscription
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    }
  }, [user, loadData]);

  // Set up realtime subscriptions
  useEffect(() => {
    if (!user || !hasFetched.current) return;

    // Subscribe to realtime changes on students table
    const channel = supabase
      .channel('db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'students',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          if (isProcessingRealtimeRef.current) return;
          isProcessingRealtimeRef.current = true;
          
          try {
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const s = payload.new as any;
              const mappedStudent: Student = {
                id: s.id,
                name: s.name,
                color: s.color,
                behaviors: (s.behaviors as unknown as Behavior[]) || [],
                customAntecedents: (s.custom_antecedents as unknown as string[]) || [],
                customConsequences: (s.custom_consequences as unknown as string[]) || [],
                isArchived: s.is_archived,
                archivedAt: s.archived_at ? new Date(s.archived_at) : undefined,
                // Extended profile fields
                dateOfBirth: s.date_of_birth ? new Date(s.date_of_birth) : undefined,
                grade: s.grade || undefined,
                school: s.school || undefined,
                caseTypes: (s.case_types as unknown as import('@/types/behavior').CaseType[]) || [],
                assessmentModeEnabled: s.assessment_mode_enabled || false,
                // FBA/Assessment data
                fbaWorkflowProgress: s.fba_workflow_progress ? {
                  ...s.fba_workflow_progress,
                  updatedAt: s.fba_workflow_progress.updatedAt ? new Date(s.fba_workflow_progress.updatedAt) : new Date(),
                } : undefined,
                fbaFindings: s.fba_findings ? {
                  ...s.fba_findings,
                  createdAt: s.fba_findings.createdAt ? new Date(s.fba_findings.createdAt) : new Date(),
                  updatedAt: s.fba_findings.updatedAt ? new Date(s.fba_findings.updatedAt) : new Date(),
                } : undefined,
                bipData: s.bip_data ? {
                  ...s.bip_data,
                  createdAt: s.bip_data.createdAt ? new Date(s.bip_data.createdAt) : new Date(),
                  updatedAt: s.bip_data.updatedAt ? new Date(s.bip_data.updatedAt) : new Date(),
                  reviewDate: s.bip_data.reviewDate ? new Date(s.bip_data.reviewDate) : undefined,
                } : undefined,
                // Background information for reports
                backgroundInfo: s.background_info ? {
                  ...s.background_info,
                  referralDate: s.background_info.referralDate ? new Date(s.background_info.referralDate) : undefined,
                  updatedAt: s.background_info.updatedAt ? new Date(s.background_info.updatedAt) : undefined,
                } : undefined,
                // Notes and assessments
                narrativeNotes: ((s.narrative_notes as unknown as import('@/types/behavior').NarrativeNote[]) || []).map((n: any) => ({
                  ...n,
                  timestamp: n.timestamp ? new Date(n.timestamp) : new Date(),
                })),
                indirectAssessments: ((s.indirect_assessments as unknown as import('@/types/behavior').IndirectAssessmentResult[]) || []).map((a: any) => ({
                  ...a,
                  completedAt: a.completedAt ? new Date(a.completedAt) : new Date(),
                })),
                documents: ((s.documents as unknown as import('@/types/behavior').StudentDocument[]) || []).map((d: any) => ({
                  ...d,
                  uploadedAt: d.uploadedAt ? new Date(d.uploadedAt) : new Date(),
                })),
                // Historical data for frequency/duration entries
                historicalData: s.historical_data ? {
                  frequencyEntries: ((s.historical_data as any).frequencyEntries || []).map((e: any) => ({
                    ...e,
                    timestamp: e.timestamp ? new Date(e.timestamp) : new Date(),
                  })),
                  durationEntries: ((s.historical_data as any).durationEntries || []).map((e: any) => ({
                    ...e,
                    timestamp: e.timestamp ? new Date(e.timestamp) : new Date(),
                  })),
                } : { frequencyEntries: [], durationEntries: [] },
              };
              
              const studentGoals = ((s.goals as unknown as BehaviorGoal[]) || []).map(g => ({ ...g, studentId: s.id }));
              
              // Hydrate historical entries for this student
              const studentHistoricalFreq = (mappedStudent.historicalData?.frequencyEntries || []).map((e: any) => ({
                id: e.id,
                studentId: s.id,
                behaviorId: e.behaviorId,
                count: e.count,
                timestamp: e.timestamp,
                timestamps: Array(e.count).fill(e.timestamp),
                observationDurationMinutes: e.observationDurationMinutes,
                isHistorical: true,
              }));
              
              const studentHistoricalDur = (mappedStudent.historicalData?.durationEntries || []).map((e: any) => ({
                id: e.id,
                studentId: s.id,
                behaviorId: e.behaviorId,
                duration: e.durationSeconds,
                startTime: e.timestamp,
                endTime: new Date(new Date(e.timestamp).getTime() + e.durationSeconds * 1000),
              }));
              
              useDataStore.setState((state) => {
                const existingIndex = state.students.findIndex(st => st.id === s.id);
                const newStudents = existingIndex >= 0
                  ? state.students.map((st, i) => i === existingIndex ? mappedStudent : st)
                  : [...state.students, mappedStudent];
                
                // Update goals - remove old ones for this student and add new ones
                const otherGoals = state.behaviorGoals.filter(g => g.studentId !== s.id);
                
                // Update frequency entries - keep non-historical and other students, add new historical
                const otherFreq = state.frequencyEntries.filter(e => 
                  !e.isHistorical || e.studentId !== s.id
                );
                
                // Update duration entries - keep session-based and other students
                const otherDur = state.durationEntries.filter(e => 
                  e.sessionId || e.studentId !== s.id
                );
                
                previousStudentsRef.current = JSON.stringify(newStudents);
                previousGoalsRef.current = JSON.stringify([...otherGoals, ...studentGoals]);
                
                return { 
                  students: newStudents,
                  behaviorGoals: [...otherGoals, ...studentGoals],
                  frequencyEntries: [...otherFreq, ...studentHistoricalFreq],
                  durationEntries: [...otherDur, ...studentHistoricalDur],
                };
              });
            } else if (payload.eventType === 'DELETE') {
              const deletedId = (payload.old as any).id;
              useDataStore.setState((state) => {
                const newStudents = state.students.filter(s => s.id !== deletedId);
                const newGoals = state.behaviorGoals.filter(g => g.studentId !== deletedId);
                previousStudentsRef.current = JSON.stringify(newStudents);
                previousGoalsRef.current = JSON.stringify(newGoals);
                return { 
                  students: newStudents,
                  behaviorGoals: newGoals,
                };
              });
            }
          } finally {
            setTimeout(() => {
              isProcessingRealtimeRef.current = false;
            }, 100);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sessions',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          if (isProcessingRealtimeRef.current) return;
          
          const session = payload.new as any;
          const existingSession = useDataStore.getState().sessions.find(s => s.id === session.id);
          
          if (!existingSession) {
            // Fetch session data entries for this session
            const { data: sessionDataEntries } = await supabase
              .from('session_data')
              .select('*')
              .eq('session_id', session.id)
              .order('timestamp', { ascending: true });
              
            const entries = sessionDataEntries || [];
            
            const mappedSession: Session = {
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
            
            useDataStore.setState((state) => {
              const newSessions = [mappedSession, ...state.sessions];
              previousSessionsRef.current = JSON.stringify(newSessions.map(s => s.id));
              return { sessions: newSessions };
            });
          }
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [user, hasFetched.current]);
  useEffect(() => {
    if (!user || !hasFetched.current || isLoading) return;
    
    const currentStudentsJson = JSON.stringify(students);
    const currentGoalsJson = JSON.stringify(behaviorGoals);
    
    if (currentStudentsJson === previousStudentsRef.current && 
        currentGoalsJson === previousGoalsRef.current) {
      return;
    }

    const timeout = setTimeout(() => {
      syncToCloud();
    }, 2000);

    return () => clearTimeout(timeout);
  }, [user, students, behaviorGoals, isLoading, syncToCloud]);

  // Auto-sync new sessions
  useEffect(() => {
    if (!user || !hasFetched.current || isLoading) return;
    
    const currentSessionIds = JSON.stringify(sessions.map(s => s.id));
    
    if (currentSessionIds === previousSessionsRef.current) {
      return;
    }

    const previousIds = new Set(
      previousSessionsRef.current ? JSON.parse(previousSessionsRef.current) : []
    );
    const hasNewSessions = sessions.some(s => !previousIds.has(s.id));
    
    if (hasNewSessions) {
      syncToCloud();
    }
    
    previousSessionsRef.current = currentSessionIds;
  }, [user, sessions, isLoading, syncToCloud]);

  return (
    <SyncContext.Provider value={{ isSyncing, isLoading, lastSyncTime, syncNow, reloadFromCloud, syncStatus }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}
