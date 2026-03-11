import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  Student, 
  Behavior, 
  ABCEntry, 
  FrequencyEntry, 
  DurationEntry, 
  IntervalEntry, 
  SessionConfig, 
  Session,
  TrackerOrder,
  DataCollectionMethod,
  SessionLengthOverride,
  BehaviorGoal,
  StudentIntervalStatus,
  StudentSessionStatus,
  STUDENT_COLORS,
  NarrativeNote,
  LatencyEntry,
  CaseType,
  HistoricalFrequencyEntry,
  HistoricalDurationEntry,
  SkillTarget,
  DTTSession,
  DTTTrial,
  BehaviorDefinition,
} from '@/types/behavior';
import { BehaviorDefinitionOverride, GlobalBankBehavior } from '@/types/behaviorBank';
import { supabase } from '@/integrations/supabase/client';
import { emitHistoricalDataChanged } from '@/lib/historicalDataSync';

// Direct save of historical data to database - bypasses sync debounce
const historicalSaveTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
function saveHistoricalDataDirect(studentId: string) {
  const existing = historicalSaveTimeouts.get(studentId);
  if (existing) clearTimeout(existing);
  
  const timeout = setTimeout(async () => {
    historicalSaveTimeouts.delete(studentId);
    try {
      const student = useDataStore.getState().students.find(s => s.id === studentId);
      if (!student?.historicalData) return;
      
      const serialized = {
        frequencyEntries: (student.historicalData.frequencyEntries || []).map((e: any) => ({
          ...e,
          timestamp: e.timestamp ? new Date(e.timestamp).toISOString() : new Date().toISOString(),
        })),
        durationEntries: (student.historicalData.durationEntries || []).map((e: any) => ({
          ...e,
          timestamp: e.timestamp ? new Date(e.timestamp).toISOString() : new Date().toISOString(),
        })),
      };

      const { error } = await supabase
        .from('students')
        .update({ historical_data: serialized as any })
        .eq('id', studentId);

      if (error) {
        console.error('[HistoricalSync] Failed to save:', error);
      } else {
        console.log('[HistoricalSync] Saved for student:', studentId,
          `(${serialized.frequencyEntries.length} freq, ${serialized.durationEntries.length} dur)`);
      }
    } catch (e) {
      console.error('[HistoricalSync] Error:', e);
    }
  }, 500);
  
  historicalSaveTimeouts.set(studentId, timeout);
}

interface CollapsedState {
  methods: { [studentId: string]: DataCollectionMethod[] }; // collapsed method sections
  behaviors: { [key: string]: boolean }; // studentId-behaviorId -> collapsed
}

interface TrashItem {
  id: string;
  type: 'frequency' | 'duration' | 'interval' | 'abc' | 'session';
  data: any;
  deletedAt: Date;
  studentName?: string;
  behaviorName?: string;
  description: string;
}

const TRASH_EXPIRY_MS = 20 * 60 * 1000; // 20 minutes

interface SessionFocus {
  enabled: boolean;
  activeBehaviors: { [key: string]: boolean }; // studentId-behaviorId -> active for session
  activeMethods: { [key: string]: DataCollectionMethod[] }; // studentId-behaviorId -> active methods
  studentMethods: { [studentId: string]: DataCollectionMethod[] }; // per-student method filter
}

interface DataState {
  students: Student[];
  selectedStudentIds: string[];
  abcEntries: ABCEntry[];
  frequencyEntries: FrequencyEntry[];
  durationEntries: DurationEntry[];
  intervalEntries: IntervalEntry[];
  latencyEntries: LatencyEntry[];
  sessionConfig: SessionConfig;
  sessions: Session[];
  currentSessionId: string | null;
  linkedAppointmentId: string | null; // Track linked appointment for session-appointment sync
  sessionNotes: string;
  trackerOrder: TrackerOrder;
  syncedIntervalsRunning: boolean;
  sessionStartTime: Date | null;
  sessionLengthMinutes: number;
  sessionLengthOverrides: SessionLengthOverride[];
  showTimestamps: boolean;
  behaviorGoals: BehaviorGoal[];
  collapsedState: CollapsedState;
  sessionFocus: SessionFocus;
  studentIntervalStatus: StudentIntervalStatus[]; // Track late arrivals / early departures
  studentSessionStatus: StudentSessionStatus[]; // Track pause/end per student
  trash: TrashItem[]; // Recoverable deleted items
  lastSavedDataHash: string | null; // Track when data was last saved to prevent duplicates
  
  // Global Behavior Bank - persisted custom behaviors promoted to org level
  globalBehaviorBank: GlobalBankBehavior[];
  // Overrides for built-in behavior definitions
  behaviorDefinitionOverrides: Record<string, BehaviorDefinitionOverride>;
  // Archived built-in behavior IDs (hidden from library)
  archivedBuiltInBehaviors: string[];
  
  // Student actions
  addStudent: (name: string) => void;
  updateStudentName: (id: string, name: string) => void;
  updateStudentProfile: (id: string, updates: Partial<Student>) => void;
  removeStudent: (id: string) => void;
  archiveStudent: (id: string) => void;
  unarchiveStudent: (id: string) => void;
  permanentlyDeleteStudent: (id: string) => void;
  toggleStudentSelection: (id: string) => void;
  selectAllStudents: () => void;
  deselectAllStudents: () => void;
  addCustomAntecedent: (studentId: string, antecedent: string) => void;
  addCustomConsequence: (studentId: string, consequence: string) => void;
  getStudentAntecedents: (studentId: string) => string[];
  getStudentConsequences: (studentId: string) => string[];
  
  // Narrative notes
  addNarrativeNote: (studentId: string, note: Omit<NarrativeNote, 'id'>) => void;
  updateNarrativeNote: (studentId: string, noteId: string, updates: Partial<NarrativeNote>) => void;
  deleteNarrativeNote: (studentId: string, noteId: string) => void;
  
  // Indirect assessments
  addIndirectAssessment: (studentId: string, assessment: Omit<import('@/types/behavior').IndirectAssessmentResult, 'id'>) => void;
  deleteIndirectAssessment: (studentId: string, assessmentId: string) => void;
  updateIndirectAssessment: (studentId: string, assessmentId: string, updates: Partial<import('@/types/behavior').IndirectAssessmentResult>) => void;
  
  
  // Latency actions
  addLatencyEntry: (entry: Omit<LatencyEntry, 'id'>) => void;
  getLatencyEntries: (studentId: string, behaviorId: string) => LatencyEntry[];
  
  // Behavior actions
  addBehavior: (studentId: string, behavior: Omit<Behavior, 'id'>) => void;
  addBehaviorWithMethods: (studentId: string, name: string, methods: DataCollectionMethod[], options?: { operationalDefinition?: string; category?: string; baseBehaviorId?: string }) => void;
  updateBehaviorMethods: (studentId: string, behaviorId: string, methods: DataCollectionMethod[]) => void;
  updateBehaviorDefinition: (studentId: string, behaviorId: string, operationalDefinition: string) => void;
  updateBehaviorName: (studentId: string, behaviorId: string, name: string) => void;
  removeBehavior: (studentId: string, behaviorId: string) => void;
  toggleBehaviorForStudent: (studentId: string, behaviorId: string) => void;
  setBehaviorMastered: (studentId: string, behaviorId: string, isMastered: boolean) => void;
  archiveBehavior: (studentId: string, behaviorId: string) => void;
  unarchiveBehavior: (studentId: string, behaviorId: string) => void;
  mergeBehaviors: (sourceBehaviorName: string, targetBehaviorId: string) => void;
  
  // Global Behavior Bank actions
  addToBehaviorBank: (behavior: Omit<GlobalBankBehavior, 'id' | 'promotedAt'>) => void;
  removeBankBehavior: (id: string) => void;
  updateBankBehaviorDefinition: (behaviorId: string, definition: string, category?: string) => void;
  resetBehaviorDefinition: (behaviorId: string) => void;
  advancedMergeBehaviors: (options: { sourceBehaviorId: string; targetBehaviorId: string; useSourceName: boolean }) => void;
  getBehaviorBankDefinition: (behaviorId: string) => BehaviorDefinition | undefined;
  archiveBuiltInBehavior: (behaviorId: string) => void;
  unarchiveBuiltInBehavior: (behaviorId: string) => void;
  
  // ABC actions
  addABCEntry: (entry: Omit<ABCEntry, 'id' | 'timestamp'>) => void;
  addEnhancedABCEntry: (entry: Omit<ABCEntry, 'id' | 'timestamp'>) => void;
  updateABCEntry: (id: string, updates: Partial<Omit<ABCEntry, 'id' | 'timestamp'>>) => void;
  deleteABCEntry: (id: string) => void;
  
  // Frequency actions
  incrementFrequency: (studentId: string, behaviorId: string) => void;
  decrementFrequency: (studentId: string, behaviorId: string) => void;
  resetFrequency: (studentId: string, behaviorId: string) => void;
  getFrequencyCount: (studentId: string, behaviorId: string) => number;
  markDataCollected: (studentId: string, behaviorId: string, collected: boolean) => void;
  isDataCollected: (studentId: string, behaviorId: string) => boolean;
  addFrequencyFromABC: (studentId: string, behaviorId: string, count: number) => void;
  addHistoricalFrequency: (entry: { 
    studentId: string; 
    behaviorId: string; 
    count: number; 
    timestamp: Date;
    observationDurationMinutes?: number;
  }) => void;
  addHistoricalFrequencyBatch: (entries: Array<{ 
    studentId: string; 
    behaviorId: string; 
    count: number; 
    timestamp: Date;
    observationDurationMinutes?: number;
  }>) => void;
  addHistoricalDurationBatch: (entries: Array<{
    studentId: string;
    behaviorId: string;
    durationSeconds: number;
    timestamp: Date;
  }>) => void;
  deleteFrequencyEntry: (id: string) => void;
  deleteHistoricalFrequency: (studentId: string, entryId: string) => void;
  updateFrequencyEntry: (id: string, updates: Partial<Omit<FrequencyEntry, 'id'>>) => void;
  updateHistoricalFrequency: (studentId: string, entryId: string, updates: Partial<Omit<HistoricalFrequencyEntry, 'id'>>) => void;
  getFrequencyEntries: (studentId: string, behaviorId?: string) => FrequencyEntry[];
  
  // Duration actions
  startDuration: (studentId: string, behaviorId: string) => void;
  stopDuration: (studentId: string, behaviorId: string) => number;
  getActiveDuration: (studentId: string, behaviorId: string) => DurationEntry | undefined;
  addHistoricalDuration: (entry: {
    studentId: string;
    behaviorId: string;
    durationSeconds: number;
    timestamp: Date;
  }) => void;
  deleteHistoricalDuration: (studentId: string, entryId: string) => void;
  deleteDurationEntry: (id: string) => void;
  
  // Interval actions
  recordInterval: (studentId: string, behaviorId: string, intervalNumber: number, occurred: boolean) => void;
  getIntervalData: (studentId: string, behaviorId: string) => IntervalEntry[];
  voidInterval: (studentId: string, behaviorId: string, intervalNumber: number, reason: IntervalEntry['voidReason'], customReason?: string) => void;
  unvoidInterval: (studentId: string, behaviorId: string, intervalNumber: number) => void;
  isIntervalVoided: (studentId: string, behaviorId: string, intervalNumber: number) => boolean;
  
  // Bulk interval void actions
  bulkVoidIntervals: (intervalNumber: number, reason: IntervalEntry['voidReason'], customReason?: string) => void;
  bulkUnvoidIntervals: (intervalNumber: number) => void;
  getBulkVoidedIntervals: () => { intervalNumber: number; reason: string }[];
  
  // Student interval presence
  addStudentLate: (studentId: string, joinAtInterval: number) => void;
  markStudentDeparted: (studentId: string, departAtInterval: number) => void;
  getStudentIntervalStatus: (studentId: string) => StudentIntervalStatus | undefined;
  resetStudentIntervalStatus: (studentId: string) => void;
  voidIntervalsForLateArrival: (studentId: string, joinAtInterval: number) => void;
  voidIntervalsForEarlyDeparture: (studentId: string, departAtInterval: number, totalIntervals: number) => void;
  
  // Student session status (pause/end)
  pauseStudentSession: (studentId: string) => void;
  resumeStudentSession: (studentId: string) => void;
  endStudentSession: (studentId: string) => void;
  getStudentSessionStatus: (studentId: string) => StudentSessionStatus | undefined;
  isStudentSessionPaused: (studentId: string) => boolean;
  isStudentSessionEnded: (studentId: string) => boolean;
  resetStudentSessionStatus: (studentId: string) => void;
  resetAllStudentSessionStatuses: () => void;
  
  // Session config
  updateSessionConfig: (config: Partial<SessionConfig>) => void;
  
  // Session management
  saveSession: () => { saved: boolean; isNew: boolean; hasChanges: boolean };
  getSessionDataHash: () => string;
  hasUnsavedChanges: () => boolean;
  setSessionNotes: (notes: string) => void;
  getSessions: () => Session[];
  getSessionsByDate: (date: Date) => Session[];
  getSessionsByStudent: (studentId: string) => Session[];
  deleteSession: (sessionId: string) => void;
  updateSession: (sessionId: string, updates: Partial<Session>) => void;
  mergeSessions: (sessionIds: string[]) => void;
  startSession: (linkedAppointmentId?: string, existingSessionId?: string) => void;
  setLinkedAppointmentId: (id: string | null) => void;
  getLinkedAppointmentId: () => string | null;
  resetSession: () => void;
  setSessionLength: (minutes: number) => void;
  setSessionLengthOverride: (override: SessionLengthOverride) => void;
  removeSessionLengthOverride: (studentId?: string, behaviorId?: string) => void;
  getEffectiveSessionLength: (studentId?: string, behaviorId?: string) => number;
  
  // Tracker order
  setTrackerOrder: (studentId: string, order: DataCollectionMethod[]) => void;
  getTrackerOrder: (studentId: string) => DataCollectionMethod[];
  
  // Synced intervals
  setSyncedIntervalsRunning: (running: boolean) => void;
  
  // Timestamps toggle
  setShowTimestamps: (show: boolean) => void;
  
  // Behavior goals
  addBehaviorGoal: (goal: Omit<BehaviorGoal, 'id'>) => void;
  removeBehaviorGoal: (goalId: string) => void;
  updateBehaviorGoal: (goalId: string, updates: Partial<BehaviorGoal>) => void;
  bulkAddBehavior: (studentIds: string[], behaviorName: string, methods: DataCollectionMethod[]) => void;
  bulkAddGoal: (studentIds: string[], behaviorId: string, goalData: Partial<Omit<BehaviorGoal, 'id' | 'studentId' | 'behaviorId'>>) => void;
  duplicateBehaviorConfig: (sourceStudentId: string, targetStudentId: string) => void;
  
  // Collapse state
  toggleMethodCollapsed: (studentId: string, method: DataCollectionMethod) => void;
  isMethodCollapsed: (studentId: string, method: DataCollectionMethod) => boolean;
  toggleBehaviorCollapsed: (studentId: string, behaviorId: string) => void;
  isBehaviorCollapsed: (studentId: string, behaviorId: string) => boolean;
  collapseAllForStudent: (studentId: string) => void;
  expandAllForStudent: (studentId: string) => void;
  
  // Session focus mode
  setSessionFocusEnabled: (enabled: boolean) => void;
  toggleSessionBehavior: (studentId: string, behaviorId: string) => void;
  isSessionBehaviorActive: (studentId: string, behaviorId: string) => boolean;
  setSessionBehaviorMethods: (studentId: string, behaviorId: string, methods: DataCollectionMethod[]) => void;
  getSessionBehaviorMethods: (studentId: string, behaviorId: string) => DataCollectionMethod[];
  activateAllBehaviors: () => void;
  deactivateAllBehaviors: () => void;
  
  // Per-student method toggles
  toggleStudentMethod: (studentId: string, method: DataCollectionMethod) => void;
  isStudentMethodActive: (studentId: string, method: DataCollectionMethod) => boolean;
  getActiveStudentMethods: (studentId: string) => DataCollectionMethod[];
  resetStudentMethods: (studentId: string) => void;
  
  // Trash/Recovery actions
  moveToTrash: (type: TrashItem['type'], data: any, description: string, studentName?: string, behaviorName?: string) => void;
  restoreFromTrash: (id: string) => void;
  clearTrashItem: (id: string) => void;
  clearExpiredTrash: () => void;
  
  // Skill Acquisition / DTT actions
  addSkillTarget: (studentId: string, target: Omit<SkillTarget, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateSkillTarget: (studentId: string, targetId: string, updates: Partial<SkillTarget>) => void;
  deleteSkillTarget: (studentId: string, targetId: string) => void;
  addDTTSession: (studentId: string, session: Omit<DTTSession, 'id'>) => void;
  updateDTTSession: (studentId: string, sessionId: string, updates: Partial<DTTSession>) => void;
  deleteDTTSession: (studentId: string, sessionId: string) => void;
  addHistoricalDTTSession: (studentId: string, session: Omit<DTTSession, 'id'>) => void;
  
  // Reset
  resetAllData: () => void;
  resetSessionData: () => void;
  forceEndAllSessions: () => void;
}

const DEFAULT_TRACKER_ORDER: DataCollectionMethod[] = ['frequency', 'duration', 'interval', 'abc'];

const DEFAULT_SESSION_FOCUS: SessionFocus = {
  enabled: false,
  activeBehaviors: {},
  activeMethods: {},
  studentMethods: {},
};

export const useDataStore = create<DataState>()(
  persist(
    (set, get) => ({
      students: [],
      selectedStudentIds: [],
      abcEntries: [],
      frequencyEntries: [],
      durationEntries: [],
      intervalEntries: [],
      latencyEntries: [],
      sessionConfig: {
        intervalLength: 10,
        totalIntervals: 6,
        samplingType: 'partial',
      },
      sessions: [],
      currentSessionId: null,
      linkedAppointmentId: null,
      sessionNotes: '',
      trackerOrder: {},
      syncedIntervalsRunning: false,
      sessionStartTime: null,
      sessionLengthMinutes: 60,
      sessionLengthOverrides: [],
      showTimestamps: false,
      behaviorGoals: [],
      collapsedState: { methods: {}, behaviors: {} },
      sessionFocus: DEFAULT_SESSION_FOCUS,
      studentIntervalStatus: [],
      studentSessionStatus: [],
      trash: [],
      lastSavedDataHash: null,
      globalBehaviorBank: [],
      behaviorDefinitionOverrides: {},
      archivedBuiltInBehaviors: [],

      addStudent: (name) => {
        const id = crypto.randomUUID();
        const colorIndex = get().students.length % STUDENT_COLORS.length;
        set((state) => ({
          students: [
            ...state.students,
            { id, name, behaviors: [], color: STUDENT_COLORS[colorIndex] },
          ],
        }));
      },

      removeStudent: (id) => {
        set((state) => ({
          students: state.students.filter((s) => s.id !== id),
          selectedStudentIds: state.selectedStudentIds.filter((sid) => sid !== id),
        }));
      },

      updateStudentName: (id, name) => {
        if (!name.trim()) return;
        set((state) => ({
          students: state.students.map((s) =>
            s.id === id ? { ...s, name: name.trim() } : s
          ),
        }));
      },

      // Indirect Assessments
      addIndirectAssessment: (studentId, assessment) => {
        const id = crypto.randomUUID();
        set((state) => ({
          students: state.students.map((s) =>
            s.id === studentId
              ? {
                  ...s,
                  indirectAssessments: [...(s.indirectAssessments || []), { ...assessment, id }],
                }
              : s
          ),
        }));
      },

      deleteIndirectAssessment: (studentId, assessmentId) => {
        set((state) => ({
          students: state.students.map((s) =>
            s.id === studentId
              ? {
                  ...s,
                  indirectAssessments: (s.indirectAssessments || []).filter((a) => a.id !== assessmentId),
                }
              : s
          ),
        }));
      },

      updateIndirectAssessment: (studentId, assessmentId, updates) => {
        set((state) => ({
          students: state.students.map((s) =>
            s.id === studentId
              ? {
                  ...s,
                  indirectAssessments: (s.indirectAssessments || []).map((a) =>
                    a.id === assessmentId ? { ...a, ...updates } : a
                  ),
                }
              : s
          ),
        }));
      },

      updateBehaviorName: (studentId, behaviorId, name) => {
        set((state) => ({
          students: state.students.map((s) =>
            s.id === studentId
              ? {
                  ...s,
                  behaviors: s.behaviors.map((b) =>
                    b.id === behaviorId
                      ? { ...b, name }
                      : b
                  ),
                }
              : s
          ),
        }));
      },


      updateStudentProfile: (id, updates) => {
        // Mark narrative notes as pending to protect from realtime overwrites
        if (updates.narrativeNotes) {
          import('@/lib/pendingNarrativeGuard').then(m => m.markNarrativeNotesPending(id)).catch(() => {});
        }
        set((state) => ({
          students: state.students.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        }));
      },

      archiveStudent: (id) => {
        set((state) => ({
          students: state.students.map((s) =>
            s.id === id ? { ...s, isArchived: true, archivedAt: new Date() } : s
          ),
          selectedStudentIds: state.selectedStudentIds.filter((sid) => sid !== id),
        }));
      },

      unarchiveStudent: (id) => {
        set((state) => ({
          students: state.students.map((s) =>
            s.id === id ? { ...s, isArchived: false, archivedAt: undefined } : s
          ),
        }));
      },

      permanentlyDeleteStudent: (id) => {
        set((state) => ({
          students: state.students.filter((s) => s.id !== id),
          selectedStudentIds: state.selectedStudentIds.filter((sid) => sid !== id),
          behaviorGoals: state.behaviorGoals.filter((g) => g.studentId !== id),
          abcEntries: state.abcEntries.filter((e) => e.studentId !== id),
          frequencyEntries: state.frequencyEntries.filter((e) => e.studentId !== id),
          durationEntries: state.durationEntries.filter((e) => e.studentId !== id),
          intervalEntries: state.intervalEntries.filter((e) => e.studentId !== id),
        }));
      },

      toggleStudentSelection: (id) => {
        set((state) => ({
          selectedStudentIds: state.selectedStudentIds.includes(id)
            ? state.selectedStudentIds.filter((sid) => sid !== id)
            : [...state.selectedStudentIds, id],
        }));
      },

      selectAllStudents: () => {
        set((state) => ({
          selectedStudentIds: state.students.map((s) => s.id),
        }));
      },

      deselectAllStudents: () => {
        set({ selectedStudentIds: [] });
      },

      addCustomAntecedent: (studentId, antecedent) => {
        set((state) => ({
          students: state.students.map((s) =>
            s.id === studentId
              ? { 
                  ...s, 
                  customAntecedents: [...(s.customAntecedents || []), antecedent].filter(
                    (v, i, a) => a.indexOf(v) === i // Remove duplicates
                  ) 
                }
              : s
          ),
        }));
      },

      addCustomConsequence: (studentId, consequence) => {
        set((state) => ({
          students: state.students.map((s) =>
            s.id === studentId
              ? { 
                  ...s, 
                  customConsequences: [...(s.customConsequences || []), consequence].filter(
                    (v, i, a) => a.indexOf(v) === i
                  ) 
                }
              : s
          ),
        }));
      },

      getStudentAntecedents: (studentId) => {
        const student = get().students.find(s => s.id === studentId);
        return student?.customAntecedents || [];
      },

      getStudentConsequences: (studentId) => {
        const student = get().students.find(s => s.id === studentId);
        return student?.customConsequences || [];
      },

      // Narrative Notes
      addNarrativeNote: (studentId, note) => {
        const id = crypto.randomUUID();
        set((state) => ({
          students: state.students.map((s) =>
            s.id === studentId
              ? {
                  ...s,
                  narrativeNotes: [...(s.narrativeNotes || []), { ...note, id }],
                }
              : s
          ),
        }));
      },

      updateNarrativeNote: (studentId, noteId, updates) => {
        set((state) => ({
          students: state.students.map((s) =>
            s.id === studentId
              ? {
                  ...s,
                  narrativeNotes: (s.narrativeNotes || []).map((n) =>
                    n.id === noteId ? { ...n, ...updates } : n
                  ),
                }
              : s
          ),
        }));
      },

      deleteNarrativeNote: (studentId, noteId) => {
        set((state) => ({
          students: state.students.map((s) =>
            s.id === studentId
              ? {
                  ...s,
                  narrativeNotes: (s.narrativeNotes || []).filter((n) => n.id !== noteId),
                }
              : s
          ),
        }));
      },

      // Latency Entries
      addLatencyEntry: (entry) => {
        const id = crypto.randomUUID();
        set((state) => ({
          latencyEntries: [
            ...state.latencyEntries,
            { ...entry, id },
          ],
        }));
      },

      getLatencyEntries: (studentId, behaviorId) => {
        return get().latencyEntries.filter(
          (e) => e.studentId === studentId && e.behaviorId === behaviorId
        );
      },

      addBehavior: (studentId, behavior) => {
        const id = crypto.randomUUID();
        const methods = behavior.methods?.length ? behavior.methods : [behavior.type];
        set((state) => ({
          students: state.students.map((s) =>
            s.id === studentId
              ? { ...s, behaviors: [...s.behaviors, { ...behavior, id, methods }] }
              : s
          ),
        }));
      },

      addBehaviorWithMethods: (studentId, name, methods, options) => {
        const id = crypto.randomUUID();
        const primaryType = methods[0] || 'frequency';
        const newBehavior: Behavior = { 
          id, 
          name, 
          type: primaryType, 
          methods,
          operationalDefinition: options?.operationalDefinition,
          category: options?.category,
          baseBehaviorId: options?.baseBehaviorId,
        };
        set((state) => ({
          students: state.students.map((s) =>
            s.id === studentId
              ? { 
                  ...s, 
                  behaviors: [...s.behaviors, newBehavior] 
                }
              : s
          ),
        }));
      },

      updateBehaviorMethods: (studentId, behaviorId, methods) => {
        if (methods.length === 0) return; // Must have at least one method
        set((state) => ({
          students: state.students.map((s) =>
            s.id === studentId
              ? {
                  ...s,
                  behaviors: s.behaviors.map((b) =>
                    b.id === behaviorId
                      ? { ...b, methods, type: methods[0] }
                      : b
                  ),
                }
              : s
          ),
        }));
      },

      updateBehaviorDefinition: (studentId, behaviorId, operationalDefinition) => {
        set((state) => ({
          students: state.students.map((s) =>
            s.id === studentId
              ? {
                  ...s,
                  behaviors: s.behaviors.map((b) =>
                    b.id === behaviorId
                      ? { ...b, operationalDefinition }
                      : b
                  ),
                }
              : s
          ),
        }));
      },

      removeBehavior: (studentId, behaviorId) => {
        set((state) => ({
          students: state.students.map((s) =>
            s.id === studentId
              ? { ...s, behaviors: s.behaviors.filter((b) => b.id !== behaviorId) }
              : s
          ),
        }));
      },

      toggleBehaviorForStudent: (studentId, behaviorId) => {
        // This could be used for enabling/disabling specific behaviors during a session
      },

      setBehaviorMastered: (studentId, behaviorId, isMastered) => {
        set((state) => ({
          students: state.students.map((s) =>
            s.id === studentId
              ? {
                  ...s,
                  behaviors: s.behaviors.map((b) =>
                    b.id === behaviorId
                      ? { 
                          ...b, 
                          isMastered, 
                          masteredAt: isMastered ? new Date() : undefined 
                        }
                      : b
                  ),
                }
              : s
          ),
        }));
      },

      archiveBehavior: (studentId, behaviorId) => {
        set((state) => ({
          students: state.students.map((s) =>
            s.id === studentId
              ? {
                  ...s,
                  behaviors: s.behaviors.map((b) =>
                    b.id === behaviorId
                      ? { ...b, isArchived: true }
                      : b
                  ),
                }
              : s
          ),
        }));
      },

      unarchiveBehavior: (studentId, behaviorId) => {
        set((state) => ({
          students: state.students.map((s) =>
            s.id === studentId
              ? {
                  ...s,
                  behaviors: s.behaviors.map((b) =>
                    b.id === behaviorId
                      ? { ...b, isArchived: false, isMastered: false, masteredAt: undefined }
                      : b
                  ),
                }
              : s
          ),
        }));
      },

      mergeBehaviors: (sourceBehaviorName, targetBehaviorId) => {
        // Merge all behaviors with sourceBehaviorName into the target behavior from the bank
        // This updates the baseBehaviorId for all matching behaviors while preserving custom definitions
        const state = get();
        const normalizedName = sourceBehaviorName.toLowerCase().trim();
        
        set((s) => ({
          students: s.students.map((student) => ({
            ...student,
            behaviors: student.behaviors.map((behavior) => {
              const behaviorNameMatch = behavior.name.toLowerCase().trim() === normalizedName;
              if (behaviorNameMatch && !behavior.baseBehaviorId) {
                // Link this behavior to the bank behavior, preserving any custom definition
                return {
                  ...behavior,
                  baseBehaviorId: targetBehaviorId,
                };
              }
              return behavior;
            }),
          })),
        }));
      },

      // Global Behavior Bank actions
      addToBehaviorBank: (behavior) => {
        const id = crypto.randomUUID();
        set((state) => ({
          globalBehaviorBank: [
            ...state.globalBehaviorBank,
            { ...behavior, id, promotedAt: new Date() },
          ],
        }));
      },

      removeBankBehavior: (id) => {
        set((state) => ({
          globalBehaviorBank: state.globalBehaviorBank.filter((b) => b.id !== id),
        }));
      },

      updateBankBehaviorDefinition: (behaviorId, definition, category) => {
        const state = get();
        
        // Check if this is a global bank behavior (promoted custom)
        const isGlobalBankBehavior = state.globalBehaviorBank.some((b) => b.id === behaviorId);
        
        if (isGlobalBankBehavior) {
          // Update the global bank behavior directly
          set((s) => ({
            globalBehaviorBank: s.globalBehaviorBank.map((b) =>
              b.id === behaviorId
                ? { ...b, operationalDefinition: definition, ...(category && { category }) }
                : b
            ),
          }));
        } else {
          // This is a built-in behavior - add/update override
          // Use ISO string for Date to ensure proper serialization with zustand persist
          set((s) => ({
            behaviorDefinitionOverrides: {
              ...s.behaviorDefinitionOverrides,
              [behaviorId]: {
                operationalDefinition: definition,
                ...(category && { category }),
                updatedAt: new Date().toISOString(),
              },
            },
          }));
        }
      },

      resetBehaviorDefinition: (behaviorId) => {
        // Remove the override for a built-in behavior
        set((state) => {
          const { [behaviorId]: _, ...rest } = state.behaviorDefinitionOverrides;
          return { behaviorDefinitionOverrides: rest };
        });
      },

      archiveBuiltInBehavior: (behaviorId) => {
        set((state) => ({
          archivedBuiltInBehaviors: state.archivedBuiltInBehaviors.includes(behaviorId)
            ? state.archivedBuiltInBehaviors
            : [...state.archivedBuiltInBehaviors, behaviorId],
        }));
      },

      unarchiveBuiltInBehavior: (behaviorId) => {
        set((state) => ({
          archivedBuiltInBehaviors: state.archivedBuiltInBehaviors.filter((id) => id !== behaviorId),
        }));
      },

      advancedMergeBehaviors: ({ sourceBehaviorId, targetBehaviorId, useSourceName }) => {
        const state = get();
        
        // Find source and target behaviors across all students and global bank
        let sourceName = '';
        let targetName = '';
        
        // Check students for behavior names
        state.students.forEach((student) => {
          student.behaviors.forEach((b) => {
            if (b.id === sourceBehaviorId || b.baseBehaviorId === sourceBehaviorId) {
              sourceName = b.name;
            }
            if (b.id === targetBehaviorId || b.baseBehaviorId === targetBehaviorId) {
              targetName = b.name;
            }
          });
        });
        
        // Check global bank
        const globalSource = state.globalBehaviorBank.find((b) => b.id === sourceBehaviorId);
        const globalTarget = state.globalBehaviorBank.find((b) => b.id === targetBehaviorId);
        if (globalSource) sourceName = globalSource.name;
        if (globalTarget) targetName = globalTarget.name;
        
        const finalName = useSourceName ? sourceName : targetName;
        
        set((s) => ({
          students: s.students.map((student) => ({
            ...student,
            behaviors: student.behaviors.map((behavior) => {
              // If this behavior matches the source, merge it into target
              if (behavior.id === sourceBehaviorId || behavior.baseBehaviorId === sourceBehaviorId) {
                return {
                  ...behavior,
                  id: behavior.id, // Keep original ID for data integrity
                  name: finalName,
                  baseBehaviorId: targetBehaviorId,
                };
              }
              // If this behavior is the target and we're using source name, rename it
              if (useSourceName && (behavior.id === targetBehaviorId || behavior.baseBehaviorId === targetBehaviorId)) {
                return {
                  ...behavior,
                  name: finalName,
                };
              }
              return behavior;
            }),
          })),
          // Update data entries to reference target behavior
          frequencyEntries: s.frequencyEntries.map((e) =>
            e.behaviorId === sourceBehaviorId ? { ...e, behaviorId: targetBehaviorId } : e
          ),
          durationEntries: s.durationEntries.map((e) =>
            e.behaviorId === sourceBehaviorId ? { ...e, behaviorId: targetBehaviorId } : e
          ),
          intervalEntries: s.intervalEntries.map((e) =>
            e.behaviorId === sourceBehaviorId ? { ...e, behaviorId: targetBehaviorId } : e
          ),
          abcEntries: s.abcEntries.map((e) =>
            e.behaviorId === sourceBehaviorId ? { ...e, behaviorId: targetBehaviorId } : e
          ),
          latencyEntries: s.latencyEntries.map((e) =>
            e.behaviorId === sourceBehaviorId ? { ...e, behaviorId: targetBehaviorId } : e
          ),
          // Remove source from global bank if it was there
          globalBehaviorBank: s.globalBehaviorBank.filter((b) => b.id !== sourceBehaviorId),
        }));
      },

      getBehaviorBankDefinition: (behaviorId) => {
        const state = get();
        
        // First check global bank
        const globalBehavior = state.globalBehaviorBank.find((b) => b.id === behaviorId);
        if (globalBehavior) {
          return globalBehavior;
        }
        
        // Check if there's an override
        const override = state.behaviorDefinitionOverrides[behaviorId];
        if (override) {
          // Return a merged definition (would need the original, but return override info)
          return {
            id: behaviorId,
            name: '',
            operationalDefinition: override.operationalDefinition || '',
            category: override.category || '',
            isGlobal: true,
          };
        }
        
        return undefined;
      },

      addABCEntry: (entry) => {
        // Normalize timestamp - handle both Date objects and ISO strings
        let timestamp: Date;
        const providedTimestamp = (entry as any).timestamp;
        if (providedTimestamp) {
          // If it's a string (from historical entry), convert to Date; otherwise use as-is
          timestamp = typeof providedTimestamp === 'string' 
            ? new Date(providedTimestamp) 
            : providedTimestamp;
        } else {
          timestamp = new Date();
        }
        
        set((state) => ({
          abcEntries: [
            ...state.abcEntries,
            { 
              ...entry, 
              id: crypto.randomUUID(), 
              timestamp,
              frequencyCount: entry.frequencyCount ?? 1,
              sessionId: state.currentSessionId || undefined 
            } as ABCEntry,
          ],
        }));
      },

      addEnhancedABCEntry: (entry) => {
        const state = get();
        const now = new Date();
        const abcId = crypto.randomUUID();
        
        // Add the ABC entry
        set((s) => ({
          abcEntries: [
            ...s.abcEntries,
            { 
              ...entry, 
              id: abcId, 
              timestamp: now, 
              frequencyCount: entry.frequencyCount ?? 1,
              sessionId: s.currentSessionId || undefined 
            },
          ],
        }));
        
        // Also add to frequency data
        const freqCount = entry.frequencyCount || 1;
        get().addFrequencyFromABC(entry.studentId, entry.behaviorId, freqCount);
      },

      updateABCEntry: (id, updates) => {
        set((state) => ({
          abcEntries: state.abcEntries.map((entry) =>
            entry.id === id ? { ...entry, ...updates } : entry
          ),
        }));
      },

      deleteABCEntry: (id) => {
        const state = get();
        const entry = state.abcEntries.find(e => e.id === id);
        if (entry) {
          const student = state.students.find(s => s.id === entry.studentId);
          const behavior = student?.behaviors.find(b => b.id === entry.behaviorId);
          state.moveToTrash(
            'abc',
            entry,
            `ABC: ${entry.antecedent} → ${entry.behavior} → ${entry.consequence}`,
            student?.name,
            behavior?.name
          );
        }
        set((state) => ({
          abcEntries: state.abcEntries.filter((e) => e.id !== id),
        }));
      },

      incrementFrequency: (studentId, behaviorId) => {
        const now = new Date();
        set((state) => {
          // Only operate on live (non-historical) entries to avoid corrupting recorded data
          const existing = state.frequencyEntries.find(
            (e) => e.studentId === studentId && e.behaviorId === behaviorId && !e.isHistorical
          );
          if (existing) {
            return {
              frequencyEntries: state.frequencyEntries.map((e) =>
                e === existing
                  ? { 
                      ...e, 
                      count: e.count + 1,
                      timestamps: [...(e.timestamps || []), now]
                    }
                  : e
              ),
            };
          }
          return {
            frequencyEntries: [
              ...state.frequencyEntries,
              {
                id: crypto.randomUUID(),
                studentId,
                behaviorId,
                count: 1,
                timestamp: now,
                timestamps: [now],
                sessionId: state.currentSessionId || undefined,
              },
            ],
          };
        });
      },

      decrementFrequency: (studentId, behaviorId) => {
        set((state) => ({
          frequencyEntries: state.frequencyEntries.map((e) => {
            // Only decrement live (non-historical) entries
            if (e.studentId === studentId && e.behaviorId === behaviorId && !e.isHistorical && e.count > 0) {
              const timestamps = e.timestamps ? [...e.timestamps] : [];
              timestamps.pop(); // Remove last timestamp
              return { ...e, count: e.count - 1, timestamps };
            }
            return e;
          }),
        }));
      },

      resetFrequency: (studentId, behaviorId) => {
        set((state) => ({
          // Only remove live (non-historical) entries — preserve recorded data
          frequencyEntries: state.frequencyEntries.filter(
            (e) => e.isHistorical || !(e.studentId === studentId && e.behaviorId === behaviorId)
          ),
        }));
      },

      getFrequencyCount: (studentId, behaviorId) => {
        // Only return count from live (non-historical) entries
        const entry = get().frequencyEntries.find(
          (e) => e.studentId === studentId && e.behaviorId === behaviorId && !e.isHistorical
        );
        return entry?.count ?? 0;
      },

      markDataCollected: (studentId, behaviorId, collected) => {
        const now = new Date();
        set((state) => {
          const existing = state.frequencyEntries.find(
            (e) => e.studentId === studentId && e.behaviorId === behaviorId
          );
          if (existing) {
            return {
              frequencyEntries: state.frequencyEntries.map((e) =>
                e.studentId === studentId && e.behaviorId === behaviorId
                  ? { ...e, dataCollected: collected }
                  : e
              ),
            };
          }
          // Create a new entry with 0 count but marked as data collected
          return {
            frequencyEntries: [
              ...state.frequencyEntries,
              {
                id: crypto.randomUUID(),
                studentId,
                behaviorId,
                count: 0,
                timestamp: now,
                timestamps: [],
                sessionId: state.currentSessionId || undefined,
                dataCollected: collected,
              },
            ],
          };
        });
      },

      isDataCollected: (studentId, behaviorId) => {
        const entry = get().frequencyEntries.find(
          (e) => e.studentId === studentId && e.behaviorId === behaviorId
        );
        // If count > 0, data was definitely collected
        // If count === 0, check the dataCollected flag
        return entry ? (entry.count > 0 || entry.dataCollected === true) : false;
      },

      addFrequencyFromABC: (studentId, behaviorId, count) => {
        const now = new Date();
        set((state) => {
          const existing = state.frequencyEntries.find(
            (e) => e.studentId === studentId && e.behaviorId === behaviorId
          );
          if (existing) {
            const newTimestamps = Array(count).fill(now);
            return {
              frequencyEntries: state.frequencyEntries.map((e) =>
                e.studentId === studentId && e.behaviorId === behaviorId
                  ? { 
                      ...e, 
                      count: e.count + count,
                      timestamps: [...(e.timestamps || []), ...newTimestamps]
                    }
                  : e
              ),
            };
          }
          return {
            frequencyEntries: [
              ...state.frequencyEntries,
              {
                id: crypto.randomUUID(),
                studentId,
                behaviorId,
                count,
                timestamp: now,
                timestamps: Array(count).fill(now),
                sessionId: state.currentSessionId || undefined,
              },
            ],
          };
        });
      },

      addHistoricalFrequency: (entry) => {
        const id = crypto.randomUUID();
        // Add to local state for immediate display
        set((state) => ({
          frequencyEntries: [
            ...state.frequencyEntries,
            {
              id,
              studentId: entry.studentId,
              behaviorId: entry.behaviorId,
              count: entry.count,
              timestamp: entry.timestamp,
              timestamps: Array(entry.count).fill(entry.timestamp),
              observationDurationMinutes: entry.observationDurationMinutes,
              isHistorical: true,
            },
          ],
          // Also add to student's historicalData for cloud sync
          students: state.students.map((s) =>
            s.id === entry.studentId
              ? {
                  ...s,
                  historicalData: {
                    frequencyEntries: [
                      ...(s.historicalData?.frequencyEntries || []),
                      {
                        id,
                        behaviorId: entry.behaviorId,
                        count: entry.count,
                        timestamp: entry.timestamp,
                        observationDurationMinutes: entry.observationDurationMinutes,
                      },
                    ],
                    durationEntries: s.historicalData?.durationEntries || [],
                  },
                }
              : s
          ),
        }));
        // Immediately persist to database (bypass debounced sync)
        saveHistoricalDataDirect(entry.studentId);
      },

      addHistoricalFrequencyBatch: (entries) => {
        if (entries.length === 0) return;
        
        // Generate all IDs upfront
        const entriesWithIds = entries.map(entry => ({
          ...entry,
          id: crypto.randomUUID(),
        }));
        
        // Single state update for all entries
        set((state) => {
          // Build new frequency entries
          const newFrequencyEntries = entriesWithIds.map(entry => ({
            id: entry.id,
            studentId: entry.studentId,
            behaviorId: entry.behaviorId,
            count: entry.count,
            timestamp: entry.timestamp,
            timestamps: Array(entry.count).fill(entry.timestamp),
            observationDurationMinutes: entry.observationDurationMinutes,
            isHistorical: true,
          }));
          
          // Group entries by studentId for efficient student updates
          const entriesByStudent = entriesWithIds.reduce((acc, entry) => {
            if (!acc[entry.studentId]) acc[entry.studentId] = [];
            acc[entry.studentId].push(entry);
            return acc;
          }, {} as Record<string, typeof entriesWithIds>);
          
          // Update students with their historical data
          const updatedStudents = state.students.map((s) => {
            const studentEntries = entriesByStudent[s.id];
            if (!studentEntries) return s;
            
            return {
              ...s,
              historicalData: {
                frequencyEntries: [
                  ...(s.historicalData?.frequencyEntries || []),
                  ...studentEntries.map(entry => ({
                    id: entry.id,
                    behaviorId: entry.behaviorId,
                    count: entry.count,
                    timestamp: entry.timestamp,
                    observationDurationMinutes: entry.observationDurationMinutes,
                  })),
                ],
                durationEntries: s.historicalData?.durationEntries || [],
              },
            };
          });
          
          return {
            frequencyEntries: [...state.frequencyEntries, ...newFrequencyEntries],
            students: updatedStudents,
          };
        });
        // Immediately persist to database for all affected students
        const affectedStudentIds = [...new Set(entries.map(e => e.studentId))];
        affectedStudentIds.forEach(id => saveHistoricalDataDirect(id));
      },

      addHistoricalDurationBatch: (entries) => {
        if (entries.length === 0) return;
        
        // Generate all IDs upfront
        const entriesWithIds = entries.map(entry => ({
          ...entry,
          id: crypto.randomUUID(),
        }));
        
        // Single state update for all entries
        set((state) => {
          // Build new duration entries
          const newDurationEntries = entriesWithIds.map(entry => ({
            id: entry.id,
            studentId: entry.studentId,
            behaviorId: entry.behaviorId,
            duration: entry.durationSeconds,
            startTime: entry.timestamp,
            endTime: new Date(new Date(entry.timestamp).getTime() + entry.durationSeconds * 1000),
          }));
          
          // Group entries by studentId for efficient student updates
          const entriesByStudent = entriesWithIds.reduce((acc, entry) => {
            if (!acc[entry.studentId]) acc[entry.studentId] = [];
            acc[entry.studentId].push(entry);
            return acc;
          }, {} as Record<string, typeof entriesWithIds>);
          
          // Update students with their historical data
          const updatedStudents = state.students.map((s) => {
            const studentEntries = entriesByStudent[s.id];
            if (!studentEntries) return s;
            
            return {
              ...s,
              historicalData: {
                frequencyEntries: s.historicalData?.frequencyEntries || [],
                durationEntries: [
                  ...(s.historicalData?.durationEntries || []),
                  ...studentEntries.map(entry => ({
                    id: entry.id,
                    behaviorId: entry.behaviorId,
                    durationSeconds: entry.durationSeconds,
                    timestamp: entry.timestamp,
                  })),
                ],
              },
            };
          });
          
          return {
            durationEntries: [...state.durationEntries, ...newDurationEntries],
            students: updatedStudents,
          };
        });
        // Immediately persist to database for all affected students
        const affectedStudentIds = [...new Set(entries.map(e => e.studentId))];
        affectedStudentIds.forEach(id => saveHistoricalDataDirect(id));
      },

      deleteFrequencyEntry: (id) => {
        const state = get();
        const entry = state.frequencyEntries.find(e => e.id === id);
        if (entry) {
          const student = state.students.find(s => s.id === entry.studentId);
          const behavior = student?.behaviors.find(b => b.id === entry.behaviorId);
          state.moveToTrash(
            'frequency',
            entry,
            `Frequency: ${entry.count} occurrences${entry.isHistorical ? ' (historical)' : ''}`,
            student?.name,
            behavior?.name
          );
        }
        set((state) => ({
          frequencyEntries: state.frequencyEntries.filter((e) => e.id !== id),
          // Also remove from student's historicalData
          students: state.students.map((s) =>
            entry && s.id === entry.studentId
              ? {
                  ...s,
                  historicalData: {
                    frequencyEntries: (s.historicalData?.frequencyEntries || []).filter(e => e.id !== id),
                    durationEntries: s.historicalData?.durationEntries || [],
                  },
                }
              : s
          ),
        }));
        // Persist deletion to database
        if (entry?.isHistorical) {
          saveHistoricalDataDirect(entry.studentId);
        }
      },

      deleteHistoricalFrequency: (studentId, entryId) => {
        set((state) => ({
          frequencyEntries: state.frequencyEntries.filter((e) => e.id !== entryId),
          students: state.students.map((s) =>
            s.id === studentId
              ? {
                  ...s,
                  historicalData: {
                    frequencyEntries: (s.historicalData?.frequencyEntries || []).filter(e => e.id !== entryId),
                    durationEntries: s.historicalData?.durationEntries || [],
                  },
                }
              : s
          ),
        }));
        // Persist deletion to database
        saveHistoricalDataDirect(studentId);
      },

      updateFrequencyEntry: (id, updates) => {
        set((state) => ({
          frequencyEntries: state.frequencyEntries.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
        }));
      },

      updateHistoricalFrequency: (studentId, entryId, updates) => {
        set((state) => ({
          frequencyEntries: state.frequencyEntries.map((e) =>
            e.id === entryId ? { ...e, ...updates } : e
          ),
          students: state.students.map((s) =>
            s.id === studentId
              ? {
                  ...s,
                  historicalData: {
                    frequencyEntries: (s.historicalData?.frequencyEntries || []).map(e =>
                      e.id === entryId ? { ...e, ...updates } : e
                    ),
                    durationEntries: s.historicalData?.durationEntries || [],
                  },
                }
              : s
          ),
        }));
      },

      getFrequencyEntries: (studentId, behaviorId) => {
        return get().frequencyEntries.filter(
          (e) => e.studentId === studentId && (behaviorId ? e.behaviorId === behaviorId : true)
        );
      },

      startDuration: (studentId, behaviorId) => {
        set((state) => ({
          durationEntries: [
            ...state.durationEntries,
            {
              id: crypto.randomUUID(),
              studentId,
              behaviorId,
              duration: 0,
              startTime: new Date(),
              sessionId: state.currentSessionId || undefined,
            },
          ],
        }));
      },

      stopDuration: (studentId, behaviorId) => {
        const now = new Date();
        let duration = 0;
        set((state) => {
          const entries = state.durationEntries.map((e) => {
            if (e.studentId === studentId && e.behaviorId === behaviorId && !e.endTime) {
              duration = Math.floor((now.getTime() - new Date(e.startTime).getTime()) / 1000);
              return { ...e, endTime: now, duration };
            }
            return e;
          });
          return { durationEntries: entries };
        });
        return duration;
      },

      getActiveDuration: (studentId, behaviorId) => {
        return get().durationEntries.find(
          (e) => e.studentId === studentId && e.behaviorId === behaviorId && !e.endTime
        );
      },

      addHistoricalDuration: (entry) => {
        const id = crypto.randomUUID();
        set((state) => ({
          durationEntries: [
            ...state.durationEntries,
            {
              id,
              studentId: entry.studentId,
              behaviorId: entry.behaviorId,
              duration: entry.durationSeconds,
              startTime: entry.timestamp,
              endTime: new Date(new Date(entry.timestamp).getTime() + entry.durationSeconds * 1000),
            },
          ],
          students: state.students.map((s) =>
            s.id === entry.studentId
              ? {
                  ...s,
                  historicalData: {
                    frequencyEntries: s.historicalData?.frequencyEntries || [],
                    durationEntries: [
                      ...(s.historicalData?.durationEntries || []),
                      {
                        id,
                        behaviorId: entry.behaviorId,
                        durationSeconds: entry.durationSeconds,
                        timestamp: entry.timestamp,
                      },
                    ],
                  },
                }
              : s
          ),
        }));
      },

      deleteHistoricalDuration: (studentId, entryId) => {
        set((state) => ({
          durationEntries: state.durationEntries.filter((e) => e.id !== entryId),
          students: state.students.map((s) =>
            s.id === studentId
              ? {
                  ...s,
                  historicalData: {
                    frequencyEntries: s.historicalData?.frequencyEntries || [],
                    durationEntries: (s.historicalData?.durationEntries || []).filter(e => e.id !== entryId),
                  },
                }
              : s
          ),
        }));
      },

      deleteDurationEntry: (id) => {
        const state = get();
        const entry = state.durationEntries.find(e => e.id === id);
        if (entry) {
          const student = state.students.find(s => s.id === entry.studentId);
          const behavior = student?.behaviors.find(b => b.id === entry.behaviorId);
          state.moveToTrash(
            'duration',
            entry,
            `Duration: ${Math.floor(entry.duration / 60)}m ${entry.duration % 60}s`,
            student?.name,
            behavior?.name
          );
        }
        set((state) => ({
          durationEntries: state.durationEntries.filter((e) => e.id !== id),
          students: state.students.map((s) =>
            entry && s.id === entry.studentId
              ? {
                  ...s,
                  historicalData: {
                    frequencyEntries: s.historicalData?.frequencyEntries || [],
                    durationEntries: (s.historicalData?.durationEntries || []).filter(e => e.id !== id),
                  },
                }
              : s
          ),
        }));
      },

      recordInterval: (studentId, behaviorId, intervalNumber, occurred) => {
        set((state) => {
          const existing = state.intervalEntries.find(
            (e) =>
              e.studentId === studentId &&
              e.behaviorId === behaviorId &&
              e.intervalNumber === intervalNumber
          );
          if (existing) {
            return {
              intervalEntries: state.intervalEntries.map((e) =>
                e.studentId === studentId &&
                e.behaviorId === behaviorId &&
                e.intervalNumber === intervalNumber
                  ? { ...e, occurred }
                  : e
              ),
            };
          }
          return {
            intervalEntries: [
              ...state.intervalEntries,
              {
                id: crypto.randomUUID(),
                studentId,
                behaviorId,
                intervalNumber,
                occurred,
                timestamp: new Date(),
                sessionId: state.currentSessionId || undefined,
              },
            ],
          };
        });
      },

      getIntervalData: (studentId, behaviorId) => {
        return get().intervalEntries.filter(
          (e) => e.studentId === studentId && e.behaviorId === behaviorId
        );
      },

      voidInterval: (studentId, behaviorId, intervalNumber, reason, customReason) => {
        set((state) => {
          const existing = state.intervalEntries.find(
            (e) =>
              e.studentId === studentId &&
              e.behaviorId === behaviorId &&
              e.intervalNumber === intervalNumber
          );
          if (existing) {
            return {
              intervalEntries: state.intervalEntries.map((e) =>
                e.studentId === studentId &&
                e.behaviorId === behaviorId &&
                e.intervalNumber === intervalNumber
                  ? { ...e, voided: true, voidReason: reason, voidReasonCustom: customReason }
                  : e
              ),
            };
          }
          // Create a voided entry if none exists
          return {
            intervalEntries: [
              ...state.intervalEntries,
              {
                id: crypto.randomUUID(),
                studentId,
                behaviorId,
                intervalNumber,
                occurred: false,
                voided: true,
                voidReason: reason,
                voidReasonCustom: customReason,
                timestamp: new Date(),
                sessionId: state.currentSessionId || undefined,
              },
            ],
          };
        });
      },

      unvoidInterval: (studentId, behaviorId, intervalNumber) => {
        set((state) => ({
          intervalEntries: state.intervalEntries.map((e) =>
            e.studentId === studentId &&
            e.behaviorId === behaviorId &&
            e.intervalNumber === intervalNumber
              ? { ...e, voided: false, voidReason: undefined, voidReasonCustom: undefined }
              : e
          ),
        }));
      },

      isIntervalVoided: (studentId, behaviorId, intervalNumber) => {
        const entry = get().intervalEntries.find(
          (e) =>
            e.studentId === studentId &&
            e.behaviorId === behaviorId &&
            e.intervalNumber === intervalNumber
        );
        return entry?.voided || false;
      },

      // Bulk void/unvoid for all students at a specific interval
      bulkVoidIntervals: (intervalNumber, reason, customReason) => {
        const state = get();
        const selectedStudents = state.students.filter(s => state.selectedStudentIds.includes(s.id));
        
        selectedStudents.forEach(student => {
          const intervalBehaviors = student.behaviors.filter(b => 
            (b.methods || [b.type]).includes('interval')
          );
          intervalBehaviors.forEach(behavior => {
            get().voidInterval(student.id, behavior.id, intervalNumber, reason, customReason);
          });
        });
      },

      bulkUnvoidIntervals: (intervalNumber) => {
        const state = get();
        const selectedStudents = state.students.filter(s => state.selectedStudentIds.includes(s.id));
        
        selectedStudents.forEach(student => {
          const intervalBehaviors = student.behaviors.filter(b => 
            (b.methods || [b.type]).includes('interval')
          );
          intervalBehaviors.forEach(behavior => {
            get().unvoidInterval(student.id, behavior.id, intervalNumber);
          });
        });
      },

      getBulkVoidedIntervals: () => {
        const state = get();
        const voidedMap = new Map<number, string>();
        
        // Find intervals that are voided across all students/behaviors with bulk reasons
        state.intervalEntries.forEach(entry => {
          if (entry.voided && entry.voidReason && 
              ['fire_drill', 'break', 'transition', 'other'].includes(entry.voidReason)) {
            const reason = entry.voidReason === 'other' && entry.voidReasonCustom 
              ? entry.voidReasonCustom 
              : entry.voidReason;
            voidedMap.set(entry.intervalNumber, reason);
          }
        });
        
        return Array.from(voidedMap.entries()).map(([intervalNumber, reason]) => ({
          intervalNumber,
          reason,
        }));
      },

      addStudentLate: (studentId, joinAtInterval) => {
        set((state) => {
          const existing = state.studentIntervalStatus.find((s) => s.studentId === studentId);
          if (existing) {
            return {
              studentIntervalStatus: state.studentIntervalStatus.map((s) =>
                s.studentId === studentId ? { ...s, joinedAtInterval: joinAtInterval } : s
              ),
            };
          }
          return {
            studentIntervalStatus: [
              ...state.studentIntervalStatus,
              { studentId, joinedAtInterval: joinAtInterval },
            ],
          };
        });
      },

      markStudentDeparted: (studentId, departAtInterval) => {
        set((state) => ({
          studentIntervalStatus: state.studentIntervalStatus.map((s) =>
            s.studentId === studentId ? { ...s, departedAtInterval: departAtInterval } : s
          ),
        }));
      },

      getStudentIntervalStatus: (studentId) => {
        return get().studentIntervalStatus.find((s) => s.studentId === studentId);
      },

      resetStudentIntervalStatus: (studentId) => {
        set((state) => ({
          studentIntervalStatus: state.studentIntervalStatus.filter((s) => s.studentId !== studentId),
        }));
      },

      voidIntervalsForLateArrival: (studentId, joinAtInterval) => {
        const state = get();
        const student = state.students.find((s) => s.id === studentId);
        if (!student) return;

        const intervalBehaviors = student.behaviors.filter((b) =>
          (b.methods || [b.type]).includes('interval')
        );

        intervalBehaviors.forEach((behavior) => {
          for (let i = 0; i < joinAtInterval; i++) {
            get().voidInterval(studentId, behavior.id, i, 'late_arrival');
          }
        });
      },

      voidIntervalsForEarlyDeparture: (studentId, departAtInterval, totalIntervals) => {
        const state = get();
        const student = state.students.find((s) => s.id === studentId);
        if (!student) return;

        const intervalBehaviors = student.behaviors.filter((b) =>
          (b.methods || [b.type]).includes('interval')
        );

        intervalBehaviors.forEach((behavior) => {
          for (let i = departAtInterval; i < totalIntervals; i++) {
            get().voidInterval(studentId, behavior.id, i, 'early_departure');
          }
        });
      },

      // Student session status (pause/end)
      pauseStudentSession: (studentId) => {
        const now = new Date();
        set((state) => {
          const existing = state.studentSessionStatus.find((s) => s.studentId === studentId);
          if (existing) {
            return {
              studentSessionStatus: state.studentSessionStatus.map((s) =>
                s.studentId === studentId
                  ? { ...s, isPaused: true, pausedAt: now }
                  : s
              ),
            };
          }
          return {
            studentSessionStatus: [
              ...state.studentSessionStatus,
              {
                studentId,
                isPaused: true,
                pausedAt: now,
                pauseDurations: [],
                hasEnded: false,
              },
            ],
          };
        });
      },

      resumeStudentSession: (studentId) => {
        const now = new Date();
        set((state) => {
          const existing = state.studentSessionStatus.find((s) => s.studentId === studentId);
          if (!existing || !existing.pausedAt) return state;
          
          const pauseDuration = now.getTime() - new Date(existing.pausedAt).getTime();
          return {
            studentSessionStatus: state.studentSessionStatus.map((s) =>
              s.studentId === studentId
                ? {
                    ...s,
                    isPaused: false,
                    pausedAt: undefined,
                    pauseDurations: [...s.pauseDurations, pauseDuration],
                  }
                : s
            ),
          };
        });
      },

      endStudentSession: (studentId) => {
        const now = new Date();
        const state = get();
        const sessionStart = state.sessionStartTime;
        
        set((s) => {
          const existing = s.studentSessionStatus.find((st) => st.studentId === studentId);
          const totalPauseDuration = existing?.pauseDurations.reduce((sum, d) => sum + d, 0) || 0;
          const effectiveMs = sessionStart 
            ? now.getTime() - new Date(sessionStart).getTime() - totalPauseDuration 
            : 0;
          const effectiveMinutes = effectiveMs / 60000;

          if (existing) {
            return {
              studentSessionStatus: s.studentSessionStatus.map((st) =>
                st.studentId === studentId
                  ? {
                      ...st,
                      hasEnded: true,
                      endedAt: now,
                      isPaused: false,
                      effectiveSessionMinutes: effectiveMinutes,
                    }
                  : st
              ),
            };
          }
          return {
            studentSessionStatus: [
              ...s.studentSessionStatus,
              {
                studentId,
                isPaused: false,
                pauseDurations: [],
                hasEnded: true,
                endedAt: now,
                effectiveSessionMinutes: effectiveMinutes,
              },
            ],
          };
        });
      },

      getStudentSessionStatus: (studentId) => {
        return get().studentSessionStatus.find((s) => s.studentId === studentId);
      },

      isStudentSessionPaused: (studentId) => {
        const status = get().studentSessionStatus.find((s) => s.studentId === studentId);
        return status?.isPaused || false;
      },

      isStudentSessionEnded: (studentId) => {
        const status = get().studentSessionStatus.find((s) => s.studentId === studentId);
        return status?.hasEnded || false;
      },

      resetStudentSessionStatus: (studentId) => {
        set((state) => ({
          studentSessionStatus: state.studentSessionStatus.filter((s) => s.studentId !== studentId),
        }));
      },

      resetAllStudentSessionStatuses: () => {
        set({ studentSessionStatus: [] });
      },

      updateSessionConfig: (config) => {
        set((state) => ({
          sessionConfig: { ...state.sessionConfig, ...config },
        }));
      },

      getSessionDataHash: () => {
        const state = get();
        // Create a hash of current session data to detect changes
        const dataToHash = {
          notes: state.sessionNotes,
          studentIds: [...state.selectedStudentIds].sort(),
          abc: state.abcEntries.map(e => ({ id: e.id, ts: e.timestamp })),
          freq: state.frequencyEntries.map(e => ({ id: e.id, count: e.count })),
          dur: state.durationEntries.map(e => ({ id: e.id, dur: e.duration })),
          int: state.intervalEntries.map(e => ({ id: e.id, occurred: e.occurred, voided: e.voided })),
        };
        return JSON.stringify(dataToHash);
      },

      hasUnsavedChanges: () => {
        const state = get();
        const currentHash = get().getSessionDataHash();
        // If no data at all, no unsaved changes
        const hasData = state.abcEntries.length > 0 || 
                        state.frequencyEntries.some(e => e.count > 0) || 
                        state.durationEntries.some(e => e.duration > 0) || 
                        state.intervalEntries.length > 0;
        if (!hasData) return false;
        // If never saved, there are unsaved changes
        if (!state.lastSavedDataHash) return true;
        // Compare current state to last saved state
        return currentHash !== state.lastSavedDataHash;
      },

      saveSession: () => {
        const state = get();
        const currentHash = get().getSessionDataHash();
        
        // Check if there's any data to save
        const hasData = state.abcEntries.length > 0 || 
                        state.frequencyEntries.some(e => e.count > 0) || 
                        state.durationEntries.some(e => e.duration > 0) || 
                        state.intervalEntries.length > 0;
        
        if (!hasData) {
          return { saved: false, isNew: false, hasChanges: false };
        }
        
        // Check if data has changed since last save
        const hasChanges = !state.lastSavedDataHash || currentHash !== state.lastSavedDataHash;
        
        if (!hasChanges) {
          return { saved: false, isNew: false, hasChanges: false };
        }

        const sessionData = {
          notes: state.sessionNotes,
          studentIds: state.selectedStudentIds,
          sessionLengthMinutes: state.sessionLengthMinutes,
          sessionLengthOverrides: [...state.sessionLengthOverrides],
          abcEntries: [...state.abcEntries],
          frequencyEntries: [...state.frequencyEntries],
          durationEntries: [...state.durationEntries],
          intervalEntries: [...state.intervalEntries],
        };

        // If we already have a currentSessionId, update the existing session instead of creating a new one
        const existingSession = state.currentSessionId 
          ? state.sessions.find(s => s.id === state.currentSessionId) 
          : null;

        if (existingSession) {
          set((s) => ({
            sessions: s.sessions.map(sess => 
              sess.id === state.currentSessionId 
                ? { ...sess, ...sessionData }
                : sess
            ),
            lastSavedDataHash: currentHash,
          }));
          return { saved: true, isNew: false, hasChanges: true };
        }

        const session: Session = {
          id: state.currentSessionId || crypto.randomUUID(),
          date: new Date(),
          ...sessionData,
        };
        set((s) => ({
          sessions: [...s.sessions, session],
          currentSessionId: session.id,
          lastSavedDataHash: currentHash,
        }));
        return { saved: true, isNew: true, hasChanges: true };
      },

      startSession: (linkedAppointmentId?: string, existingSessionId?: string) => {
        // Store as Date.now() timestamp-based Date to avoid serialization issues
        const now = new Date();
        const newSessionId = existingSessionId || crypto.randomUUID();
        const state = get();
        
        // Clean stale live entries from previous sessions that were never properly saved/ended.
        // Preserve: historical entries, entries belonging to saved sessions, entries with no sessionId that are historical.
        const savedSessionIds = new Set(state.sessions.map(s => s.id));
        const isStale = (e: { sessionId?: string; isHistorical?: boolean }) => {
          if (e.isHistorical) return false; // Never remove historical data
          if (!e.sessionId) return true; // Orphaned live entry with no session — stale
          if (savedSessionIds.has(e.sessionId)) return false; // Belongs to a saved session
          if (e.sessionId === state.currentSessionId) return true; // Old active session being replaced
          return true; // Entry from an unsaved, non-current session — stale
        };
        
        set({ 
          sessionStartTime: now,
          currentSessionId: newSessionId,
          linkedAppointmentId: linkedAppointmentId || null,
          // Remove stale live entries so new session starts clean
          frequencyEntries: state.frequencyEntries.filter(e => !isStale(e)),
          durationEntries: state.durationEntries.filter(e => !isStale(e as any)),
          abcEntries: state.abcEntries.filter(e => !isStale(e as any)),
          intervalEntries: state.intervalEntries.filter(e => !isStale(e as any)),
        });
      },

      setLinkedAppointmentId: (id) => {
        set({ linkedAppointmentId: id });
      },

      getLinkedAppointmentId: () => get().linkedAppointmentId,

      resetSession: () => {
        const state = get();
        // Clean stale live entries when resetting session
        const savedSessionIds = new Set(state.sessions.map(s => s.id));
        const isStale = (e: { sessionId?: string; isHistorical?: boolean }) => {
          if (e.isHistorical) return false;
          if (!e.sessionId) return true;
          if (savedSessionIds.has(e.sessionId)) return false;
          return true;
        };
        
        set({ 
          sessionStartTime: null,
          currentSessionId: null,
          linkedAppointmentId: null,
          selectedStudentIds: [],
          studentSessionStatus: [],
          studentIntervalStatus: [],
          syncedIntervalsRunning: false,
          frequencyEntries: state.frequencyEntries.filter(e => !isStale(e)),
          durationEntries: state.durationEntries.filter(e => !isStale(e as any)),
          abcEntries: state.abcEntries.filter(e => !isStale(e as any)),
          intervalEntries: state.intervalEntries.filter(e => !isStale(e as any)),
        });
      },

      setSessionLength: (minutes) => {
        set({ sessionLengthMinutes: minutes });
      },

      setSessionLengthOverride: (override) => {
        set((state) => {
          const existing = state.sessionLengthOverrides.findIndex(
            o => o.studentId === override.studentId && o.behaviorId === override.behaviorId
          );
          if (existing >= 0) {
            const newOverrides = [...state.sessionLengthOverrides];
            newOverrides[existing] = override;
            return { sessionLengthOverrides: newOverrides };
          }
          return { sessionLengthOverrides: [...state.sessionLengthOverrides, override] };
        });
      },

      removeSessionLengthOverride: (studentId, behaviorId) => {
        set((state) => ({
          sessionLengthOverrides: state.sessionLengthOverrides.filter(
            o => !(o.studentId === studentId && o.behaviorId === behaviorId)
          ),
        }));
      },

      getEffectiveSessionLength: (studentId, behaviorId) => {
        const state = get();
        // Check for specific behavior override
        if (behaviorId) {
          const behaviorOverride = state.sessionLengthOverrides.find(
            o => o.behaviorId === behaviorId
          );
          if (behaviorOverride) return behaviorOverride.lengthMinutes;
        }
        // Check for student override
        if (studentId) {
          const studentOverride = state.sessionLengthOverrides.find(
            o => o.studentId === studentId && !o.behaviorId
          );
          if (studentOverride) return studentOverride.lengthMinutes;
        }
        return state.sessionLengthMinutes;
      },

      setSessionNotes: (notes) => {
        set({ sessionNotes: notes });
      },

      getSessions: () => {
        return get().sessions;
      },

      getSessionsByDate: (date) => {
        return get().sessions.filter((s) => {
          const sessionDate = new Date(s.date);
          return sessionDate.toDateString() === date.toDateString();
        });
      },

      getSessionsByStudent: (studentId) => {
        return get().sessions.filter((s) => s.studentIds.includes(studentId));
      },

      deleteSession: (sessionId) => {
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== sessionId),
        }));
      },

      updateSession: (sessionId, updates) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, ...updates } : s
          ),
        }));
      },

      mergeSessions: (sessionIds) => {
        const state = get();
        const toMerge = state.sessions
          .filter((s) => sessionIds.includes(s.id))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        if (toMerge.length < 2) return;

        const primary = toMerge[0];
        
        // For frequency entries, deduplicate by student+behavior, keeping the latest (most updated) value
        const allFreqEntries = toMerge.flatMap(s => s.frequencyEntries || []);
        const freqByKey = new Map<string, typeof allFreqEntries[0]>();
        for (const entry of allFreqEntries) {
          const key = `${entry.studentId}:${entry.behaviorId}`;
          const existing = freqByKey.get(key);
          if (!existing || entry.count > existing.count) {
            freqByKey.set(key, entry);
          }
        }

        // For duration entries, deduplicate by student+behavior, keeping the latest value
        const allDurEntries = toMerge.flatMap(s => s.durationEntries || []);
        const durByKey = new Map<string, typeof allDurEntries[0]>();
        for (const entry of allDurEntries) {
          const key = `${entry.studentId}:${entry.behaviorId}`;
          const existing = durByKey.get(key);
          if (!existing || entry.duration > existing.duration) {
            durByKey.set(key, entry);
          }
        }

        // Collect ABC entries from both inline session arrays AND the global store
        const inlineAbcEntries = toMerge.flatMap(s => s.abcEntries || []);
        const globalAbcForMerge = state.abcEntries.filter(e => sessionIds.includes(e.sessionId || ''));
        const seenAbcIds = new Set<string>();
        const mergedAbcEntries = [...inlineAbcEntries, ...globalAbcForMerge].filter(e => {
          if (seenAbcIds.has(e.id)) return false;
          seenAbcIds.add(e.id);
          return true;
        });

        const mergedSession: Session = {
          ...primary,
          notes: toMerge.map(s => s.notes).filter(Boolean).join('\n---\n'),
          studentIds: [...new Set(toMerge.flatMap(s => s.studentIds))],
          sessionLengthMinutes: Math.max(...toMerge.map(s => s.sessionLengthMinutes)),
          abcEntries: mergedAbcEntries,
          frequencyEntries: Array.from(freqByKey.values()),
          durationEntries: Array.from(durByKey.values()),
          intervalEntries: toMerge.flatMap(s => s.intervalEntries || []),
        };

        set((state) => ({
          sessions: [
            ...state.sessions.filter((s) => !sessionIds.includes(s.id)),
            mergedSession,
          ],
          // Re-point global ABC entries from merged sessions to the new primary session
          abcEntries: state.abcEntries.map(e =>
            sessionIds.includes(e.sessionId || '') && e.sessionId !== primary.id
              ? { ...e, sessionId: primary.id }
              : e
          ),
        }));
      },

      setTrackerOrder: (studentId, order) => {
        set((state) => ({
          trackerOrder: { ...state.trackerOrder, [studentId]: order },
        }));
      },

      getTrackerOrder: (studentId) => {
        return get().trackerOrder[studentId] || DEFAULT_TRACKER_ORDER;
      },

      setSyncedIntervalsRunning: (running) => {
        set({ syncedIntervalsRunning: running });
      },

      setShowTimestamps: (show) => {
        set({ showTimestamps: show });
      },

      addBehaviorGoal: (goal) => {
        set((state) => ({
          behaviorGoals: [
            ...state.behaviorGoals,
            { ...goal, id: crypto.randomUUID() },
          ],
        }));
      },

      removeBehaviorGoal: (goalId) => {
        set((state) => ({
          behaviorGoals: state.behaviorGoals.filter((g) => g.id !== goalId),
        }));
      },

      updateBehaviorGoal: (goalId, updates) => {
        set((state) => ({
          behaviorGoals: state.behaviorGoals.map((g) =>
            g.id === goalId ? { ...g, ...updates } : g
          ),
        }));
      },

      bulkAddBehavior: (studentIds, behaviorName, methods) => {
        const primaryType = methods[0] || 'frequency';
        set((state) => ({
          students: state.students.map((s) =>
            studentIds.includes(s.id)
              ? {
                  ...s,
                  behaviors: [
                    ...s.behaviors,
                    { id: crypto.randomUUID(), name: behaviorName, type: primaryType, methods },
                  ],
                }
              : s
          ),
        }));
      },

      bulkAddGoal: (studentIds, behaviorId, goalData) => {
        set((state) => ({
          behaviorGoals: [
            ...state.behaviorGoals,
            ...studentIds.map((studentId) => ({
              id: crypto.randomUUID(),
              studentId,
              behaviorId,
              direction: goalData.direction || ('decrease' as const),
              metric: goalData.metric || ('frequency' as const),
              targetValue: goalData.targetValue,
              baseline: goalData.baseline,
              startDate: goalData.startDate || new Date(),
              endDate: goalData.endDate,
              notes: goalData.notes,
              introducedDate: goalData.introducedDate,
              dataCollectionStartDate: goalData.dataCollectionStartDate,
            })),
          ],
        }));
      },

      duplicateBehaviorConfig: (sourceStudentId, targetStudentId) => {
        const state = get();
        const sourceStudent = state.students.find((s) => s.id === sourceStudentId);
        const targetStudent = state.students.find((s) => s.id === targetStudentId);
        
        if (!sourceStudent || !targetStudent) return;

        // Duplicate behaviors
        const newBehaviors = sourceStudent.behaviors.map((b) => ({
          ...b,
          id: crypto.randomUUID(),
        }));

        // Duplicate custom antecedents and consequences
        const newCustomAntecedents = [...(sourceStudent.customAntecedents || [])];
        const newCustomConsequences = [...(sourceStudent.customConsequences || [])];

        set((s) => ({
          students: s.students.map((student) =>
            student.id === targetStudentId
              ? {
                  ...student,
                  behaviors: [...student.behaviors, ...newBehaviors],
                  customAntecedents: [
                    ...(student.customAntecedents || []),
                    ...newCustomAntecedents.filter(
                      (a) => !(student.customAntecedents || []).includes(a)
                    ),
                  ],
                  customConsequences: [
                    ...(student.customConsequences || []),
                    ...newCustomConsequences.filter(
                      (c) => !(student.customConsequences || []).includes(c)
                    ),
                  ],
                }
              : student
          ),
        }));
      },

      toggleMethodCollapsed: (studentId, method) => {
        set((state) => {
          const current = state.collapsedState.methods[studentId] || [];
          const isCollapsed = current.includes(method);
          return {
            collapsedState: {
              ...state.collapsedState,
              methods: {
                ...state.collapsedState.methods,
                [studentId]: isCollapsed
                  ? current.filter(m => m !== method)
                  : [...current, method],
              },
            },
          };
        });
      },

      isMethodCollapsed: (studentId, method) => {
        return get().collapsedState.methods[studentId]?.includes(method) || false;
      },

      toggleBehaviorCollapsed: (studentId, behaviorId) => {
        const key = `${studentId}-${behaviorId}`;
        set((state) => ({
          collapsedState: {
            ...state.collapsedState,
            behaviors: {
              ...state.collapsedState.behaviors,
              [key]: !state.collapsedState.behaviors[key],
            },
          },
        }));
      },

      isBehaviorCollapsed: (studentId, behaviorId) => {
        const key = `${studentId}-${behaviorId}`;
        return get().collapsedState.behaviors[key] || false;
      },

      collapseAllForStudent: (studentId) => {
        const student = get().students.find(s => s.id === studentId);
        if (!student) return;
        
        const allMethods: DataCollectionMethod[] = ['frequency', 'duration', 'interval', 'abc'];
        const behaviorKeys: { [key: string]: boolean } = {};
        student.behaviors.forEach(b => {
          behaviorKeys[`${studentId}-${b.id}`] = true;
        });
        
        set((state) => ({
          collapsedState: {
            methods: {
              ...state.collapsedState.methods,
              [studentId]: allMethods,
            },
            behaviors: {
              ...state.collapsedState.behaviors,
              ...behaviorKeys,
            },
          },
        }));
      },

      expandAllForStudent: (studentId) => {
        const student = get().students.find(s => s.id === studentId);
        if (!student) return;
        
        const behaviorKeys = { ...get().collapsedState.behaviors };
        student.behaviors.forEach(b => {
          delete behaviorKeys[`${studentId}-${b.id}`];
        });
        
        set((state) => ({
          collapsedState: {
            methods: {
              ...state.collapsedState.methods,
              [studentId]: [],
            },
            behaviors: behaviorKeys,
          },
        }));
      },

      // Session focus mode
      setSessionFocusEnabled: (enabled) => {
        set((state) => ({
          sessionFocus: { ...state.sessionFocus, enabled },
        }));
      },

      toggleSessionBehavior: (studentId, behaviorId) => {
        const key = `${studentId}-${behaviorId}`;
        set((state) => ({
          sessionFocus: {
            ...state.sessionFocus,
            activeBehaviors: {
              ...state.sessionFocus.activeBehaviors,
              [key]: !state.sessionFocus.activeBehaviors[key],
            },
          },
        }));
      },

      isSessionBehaviorActive: (studentId, behaviorId) => {
        const state = get();
        if (!state.sessionFocus.enabled) return true; // When focus mode is off, all are active
        const key = `${studentId}-${behaviorId}`;
        return state.sessionFocus.activeBehaviors[key] !== false; // Default to active
      },

      setSessionBehaviorMethods: (studentId, behaviorId, methods) => {
        const key = `${studentId}-${behaviorId}`;
        set((state) => ({
          sessionFocus: {
            ...state.sessionFocus,
            activeMethods: {
              ...state.sessionFocus.activeMethods,
              [key]: methods,
            },
          },
        }));
      },

      getSessionBehaviorMethods: (studentId, behaviorId) => {
        const state = get();
        const key = `${studentId}-${behaviorId}`;
        const student = state.students.find(s => s.id === studentId);
        const behavior = student?.behaviors.find(b => b.id === behaviorId);
        const defaultMethods = behavior?.methods || [behavior?.type || 'frequency'];
        
        if (!state.sessionFocus.enabled) return defaultMethods;
        return state.sessionFocus.activeMethods[key] || defaultMethods;
      },

      activateAllBehaviors: () => {
        const state = get();
        const activeBehaviors: { [key: string]: boolean } = {};
        state.students.forEach(s => {
          s.behaviors.forEach(b => {
            activeBehaviors[`${s.id}-${b.id}`] = true;
          });
        });
        set((state) => ({
          sessionFocus: {
            ...state.sessionFocus,
            activeBehaviors,
          },
        }));
      },

      deactivateAllBehaviors: () => {
        const state = get();
        const activeBehaviors: { [key: string]: boolean } = {};
        state.students.forEach(s => {
          s.behaviors.forEach(b => {
            activeBehaviors[`${s.id}-${b.id}`] = false;
          });
        });
        set((state) => ({
          sessionFocus: {
            ...state.sessionFocus,
            activeBehaviors,
          },
        }));
      },

      toggleStudentMethod: (studentId, method) => {
        set((state) => {
          const sessionFocus = state.sessionFocus ?? DEFAULT_SESSION_FOCUS;
          const studentMethodsMap = sessionFocus.studentMethods ?? {};
          const current = studentMethodsMap[studentId];
          // If no custom methods set, start with all methods
          const allMethods: DataCollectionMethod[] = ['frequency', 'duration', 'interval', 'abc'];
          const activeMethods = current || allMethods;
          
          const newMethods = activeMethods.includes(method)
            ? activeMethods.filter(m => m !== method)
            : [...activeMethods, method];
          
          return {
            sessionFocus: {
              ...sessionFocus,
              studentMethods: {
                ...studentMethodsMap,
                [studentId]: newMethods,
              },
            },
          };
        });
      },

      isStudentMethodActive: (studentId, method) => {
        const state = get();
        const sessionFocus = state.sessionFocus ?? DEFAULT_SESSION_FOCUS;
        const studentMethods = (sessionFocus.studentMethods ?? {})[studentId];
        // If no custom filter set, all methods are active
        if (!studentMethods) return true;
        return studentMethods.includes(method);
      },

      getActiveStudentMethods: (studentId) => {
        const state = get();
        const allMethods: DataCollectionMethod[] = ['frequency', 'duration', 'interval', 'abc'];
        const sessionFocus = state.sessionFocus ?? DEFAULT_SESSION_FOCUS;
        return (sessionFocus.studentMethods ?? {})[studentId] || allMethods;
      },

      resetStudentMethods: (studentId) => {
        set((state) => {
          const sessionFocus = state.sessionFocus ?? DEFAULT_SESSION_FOCUS;
          const newStudentMethods = { ...(sessionFocus.studentMethods ?? {}) };
          delete newStudentMethods[studentId];
          return {
            sessionFocus: {
              ...sessionFocus,
              studentMethods: newStudentMethods,
            },
          };
        });
      },

      resetAllData: () => {
        set({
          abcEntries: [],
          frequencyEntries: [],
          durationEntries: [],
          intervalEntries: [],
        });
      },

      // Force end all sessions and clear session UI state - used for stale session cleanup
      // CRITICAL: This must NOT wipe data entries from saved/completed sessions.
      // It only clears the CURRENT session's unsaved live data and resets session metadata.
      forceEndAllSessions: () => {
        const state = get();
        const sessionId = state.currentSessionId;
        
        // Only remove entries from the CURRENT active session (if any).
        // All other entries (from completed sessions, cloud-loaded data) must be preserved.
        const cleanFrequency = sessionId 
          ? state.frequencyEntries.filter(e => e.sessionId !== sessionId || e.isHistorical)
          : state.frequencyEntries; // No active session = nothing to clean
        const cleanDuration = sessionId
          ? state.durationEntries.filter(e => e.sessionId !== sessionId)
          : state.durationEntries;
        const cleanInterval = sessionId
          ? state.intervalEntries.filter(e => e.sessionId !== sessionId)
          : state.intervalEntries;
        const cleanABC = sessionId
          ? state.abcEntries.filter(e => e.sessionId !== sessionId)
          : state.abcEntries;

        set({
          sessionStartTime: null,
          currentSessionId: null,
          selectedStudentIds: [],
          studentSessionStatus: [],
          studentIntervalStatus: [],
          sessionNotes: '',
          sessionLengthOverrides: [],
          sessionFocus: DEFAULT_SESSION_FOCUS,
          syncedIntervalsRunning: false,
          lastSavedDataHash: null,
          frequencyEntries: cleanFrequency,
          durationEntries: cleanDuration,
          intervalEntries: cleanInterval,
          abcEntries: cleanABC,
        });
      },

      resetSessionData: () => {
        // CRITICAL: This function ONLY clears the UI display for the CURRENT session.
        // It NEVER deletes data that has been saved to the cloud or historical data.
        const state = get();
        const currentSessionId = state.currentSessionId;
        const hasBeenSaved = state.lastSavedDataHash !== null;
        
        // Separate current session entries from historical/other session entries
        const currentFrequency = state.frequencyEntries.filter(e => e.sessionId === currentSessionId && !e.isHistorical);
        const currentDuration = state.durationEntries.filter(e => e.sessionId === currentSessionId);
        const currentInterval = state.intervalEntries.filter(e => e.sessionId === currentSessionId);
        const currentABC = state.abcEntries.filter(e => e.sessionId === currentSessionId);
        
        // Entries from OTHER sessions or historical data - ALWAYS PRESERVED
        const otherFrequency = state.frequencyEntries.filter(e => e.sessionId !== currentSessionId || e.isHistorical);
        const otherDuration = state.durationEntries.filter(e => e.sessionId !== currentSessionId);
        const otherInterval = state.intervalEntries.filter(e => e.sessionId !== currentSessionId);
        const otherABC = state.abcEntries.filter(e => e.sessionId !== currentSessionId);
        
        if (hasBeenSaved) {
          // Current session data was saved - just reset UI state, keep ALL entries
          // (the saved entries will be reloaded from cloud on next sync)
          set({
            sessionNotes: '',
            currentSessionId: null,
            sessionStartTime: null,
            sessionLengthOverrides: [],
            sessionFocus: DEFAULT_SESSION_FOCUS,
            lastSavedDataHash: null,
            // Keep other sessions' data, clear only current session from UI
            frequencyEntries: otherFrequency,
            durationEntries: otherDuration,
            intervalEntries: otherInterval,
            abcEntries: otherABC,
          });
          return;
        }
        
        // Current session data NOT saved yet - move current session entries to trash
        currentFrequency.forEach((entry) => {
          const student = state.students.find(s => s.id === entry.studentId);
          const behavior = student?.behaviors.find(b => b.id === entry.behaviorId);
          if (entry.count > 0) {
            get().moveToTrash(
              'frequency',
              entry,
              `${behavior?.name || 'Unknown'}: ${entry.count} occurrences`,
              student?.name,
              behavior?.name
            );
          }
        });

        currentDuration.filter(e => e.endTime).forEach((entry) => {
          const student = state.students.find(s => s.id === entry.studentId);
          const behavior = student?.behaviors.find(b => b.id === entry.behaviorId);
          get().moveToTrash(
            'duration',
            entry,
            `${behavior?.name || 'Unknown'}: ${entry.duration}s duration`,
            student?.name,
            behavior?.name
          );
        });

        // Group current interval entries by student/behavior for trash
        const intervalGroups = new Map<string, IntervalEntry[]>();
        currentInterval.forEach((entry) => {
          const key = `${entry.studentId}-${entry.behaviorId}`;
          if (!intervalGroups.has(key)) {
            intervalGroups.set(key, []);
          }
          intervalGroups.get(key)!.push(entry);
        });
        intervalGroups.forEach((entries, key) => {
          const [studentId, behaviorId] = key.split('-');
          const student = state.students.find(s => s.id === studentId);
          const behavior = student?.behaviors.find(b => b.id === behaviorId);
          const occurred = entries.filter(e => e.occurred && !e.voided).length;
          const total = entries.filter(e => !e.voided).length;
          get().moveToTrash(
            'interval',
            entries,
            `${behavior?.name || 'Unknown'}: ${occurred}/${total} intervals`,
            student?.name,
            behavior?.name
          );
        });

        // Add current ABC entries to trash
        currentABC.forEach((entry) => {
          const student = state.students.find(s => s.id === entry.studentId);
          get().moveToTrash(
            'abc',
            entry,
            `ABC: ${entry.behavior}`,
            student?.name,
            entry.behavior
          );
        });

        // Only clear current session entries, preserve everything else
        set({
          frequencyEntries: otherFrequency,
          durationEntries: otherDuration,
          intervalEntries: otherInterval,
          abcEntries: otherABC,
          sessionNotes: '',
          currentSessionId: null,
          sessionStartTime: null,
          sessionLengthOverrides: [],
          sessionFocus: DEFAULT_SESSION_FOCUS,
          lastSavedDataHash: null,
        });
      },

      // Trash/Recovery functions
      moveToTrash: (type, data, description, studentName, behaviorName) => {
        set((state) => ({
          trash: [
            ...state.trash,
            {
              id: crypto.randomUUID(),
              type,
              data,
              deletedAt: new Date(),
              studentName,
              behaviorName,
              description,
            },
          ],
        }));
      },

      restoreFromTrash: (id) => {
        const state = get();
        const item = state.trash.find((t) => t.id === id);
        if (!item) return;

        set((s) => {
          const newTrash = s.trash.filter((t) => t.id !== id);
          
          switch (item.type) {
            case 'frequency':
              return {
                trash: newTrash,
                frequencyEntries: [...s.frequencyEntries, item.data],
              };
            case 'duration':
              return {
                trash: newTrash,
                durationEntries: [...s.durationEntries, item.data],
              };
            case 'interval':
              // item.data is an array of IntervalEntry
              return {
                trash: newTrash,
                intervalEntries: [...s.intervalEntries, ...item.data],
              };
            case 'abc':
              return {
                trash: newTrash,
                abcEntries: [...s.abcEntries, item.data],
              };
            default:
              return { trash: newTrash };
          }
        });
      },

      clearTrashItem: (id) => {
        set((state) => ({
          trash: state.trash.filter((t) => t.id !== id),
        }));
      },

      clearExpiredTrash: () => {
        const now = Date.now();
        set((state) => ({
          trash: state.trash.filter((t) => {
            const deletedTime = new Date(t.deletedAt).getTime();
            return now - deletedTime < TRASH_EXPIRY_MS;
          }),
        }));
      },

      // Skill Acquisition / DTT actions
      addSkillTarget: (studentId, target) => {
        const id = crypto.randomUUID();
        const now = new Date();
        set((state) => ({
          students: state.students.map((s) =>
            s.id === studentId
              ? {
                  ...s,
                  skillTargets: [
                    ...(s.skillTargets || []),
                    { ...target, id, createdAt: now, updatedAt: now },
                  ],
                }
              : s
          ),
        }));
      },

      updateSkillTarget: (studentId, targetId, updates) => {
        set((state) => ({
          students: state.students.map((s) =>
            s.id === studentId
              ? {
                  ...s,
                  skillTargets: (s.skillTargets || []).map((t) =>
                    t.id === targetId
                      ? { ...t, ...updates, updatedAt: new Date() }
                      : t
                  ),
                }
              : s
          ),
        }));
      },

      deleteSkillTarget: (studentId, targetId) => {
        set((state) => ({
          students: state.students.map((s) =>
            s.id === studentId
              ? {
                  ...s,
                  skillTargets: (s.skillTargets || []).filter((t) => t.id !== targetId),
                  // Also remove associated DTT sessions
                  dttSessions: (s.dttSessions || []).filter((sess) => sess.skillTargetId !== targetId),
                }
              : s
          ),
        }));
      },

      addDTTSession: (studentId, session) => {
        const id = crypto.randomUUID();
        set((state) => ({
          students: state.students.map((s) =>
            s.id === studentId
              ? {
                  ...s,
                  dttSessions: [...(s.dttSessions || []), { ...session, id }],
                }
              : s
          ),
        }));
      },

      updateDTTSession: (studentId, sessionId, updates) => {
        set((state) => ({
          students: state.students.map((s) =>
            s.id === studentId
              ? {
                  ...s,
                  dttSessions: (s.dttSessions || []).map((sess) =>
                    sess.id === sessionId ? { ...sess, ...updates } : sess
                  ),
                }
              : s
          ),
        }));
      },

      deleteDTTSession: (studentId, sessionId) => {
        set((state) => ({
          students: state.students.map((s) =>
            s.id === studentId
              ? {
                  ...s,
                  dttSessions: (s.dttSessions || []).filter((sess) => sess.id !== sessionId),
                }
              : s
          ),
        }));
      },

      addHistoricalDTTSession: (studentId, session) => {
        // Same as addDTTSession but allows setting custom date
        const id = crypto.randomUUID();
        set((state) => ({
          students: state.students.map((s) =>
            s.id === studentId
              ? {
                  ...s,
                  dttSessions: [...(s.dttSessions || []), { ...session, id }],
                }
              : s
          ),
        }));
      },
    }),
    {
      name: 'behavior-data-storage',
      // Never persist live session timing fields — they must always start fresh on page load.
      // Data entries (frequencyEntries, etc.) ARE persisted so in-progress data isn't lost.
      partialize: (state) => {
        const { sessionStartTime, currentSessionId, syncedIntervalsRunning, studentSessionStatus, studentIntervalStatus, ...rest } = state;
        return rest;
      },
    }
  )
);
