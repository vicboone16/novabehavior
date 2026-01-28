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
} from '@/types/behavior';

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
  
  // Latency actions
  addLatencyEntry: (entry: Omit<LatencyEntry, 'id'>) => void;
  getLatencyEntries: (studentId: string, behaviorId: string) => LatencyEntry[];
  
  // Behavior actions
  addBehavior: (studentId: string, behavior: Omit<Behavior, 'id'>) => void;
  addBehaviorWithMethods: (studentId: string, name: string, methods: DataCollectionMethod[]) => void;
  updateBehaviorMethods: (studentId: string, behaviorId: string, methods: DataCollectionMethod[]) => void;
  removeBehavior: (studentId: string, behaviorId: string) => void;
  toggleBehaviorForStudent: (studentId: string, behaviorId: string) => void;
  
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
  addFrequencyFromABC: (studentId: string, behaviorId: string, count: number) => void;
  
  // Duration actions
  startDuration: (studentId: string, behaviorId: string) => void;
  stopDuration: (studentId: string, behaviorId: string) => number;
  getActiveDuration: (studentId: string, behaviorId: string) => DurationEntry | undefined;
  
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
  saveSession: () => void;
  setSessionNotes: (notes: string) => void;
  getSessions: () => Session[];
  getSessionsByDate: (date: Date) => Session[];
  getSessionsByStudent: (studentId: string) => Session[];
  deleteSession: (sessionId: string) => void;
  startSession: () => void;
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
  
  // Reset
  resetAllData: () => void;
  resetSessionData: () => void;
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


      updateStudentProfile: (id, updates) => {
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

      addBehaviorWithMethods: (studentId, name, methods) => {
        const id = crypto.randomUUID();
        const primaryType = methods[0] || 'frequency';
        set((state) => ({
          students: state.students.map((s) =>
            s.id === studentId
              ? { 
                  ...s, 
                  behaviors: [...s.behaviors, { id, name, type: primaryType, methods }] 
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

      addABCEntry: (entry) => {
        set((state) => ({
          abcEntries: [
            ...state.abcEntries,
            { 
              ...entry, 
              id: crypto.randomUUID(), 
              timestamp: new Date(), 
              frequencyCount: entry.frequencyCount ?? 1,
              sessionId: state.currentSessionId || undefined 
            },
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
          const existing = state.frequencyEntries.find(
            (e) => e.studentId === studentId && e.behaviorId === behaviorId
          );
          if (existing) {
            return {
              frequencyEntries: state.frequencyEntries.map((e) =>
                e.studentId === studentId && e.behaviorId === behaviorId
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
            if (e.studentId === studentId && e.behaviorId === behaviorId && e.count > 0) {
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
          frequencyEntries: state.frequencyEntries.filter(
            (e) => !(e.studentId === studentId && e.behaviorId === behaviorId)
          ),
        }));
      },

      getFrequencyCount: (studentId, behaviorId) => {
        const entry = get().frequencyEntries.find(
          (e) => e.studentId === studentId && e.behaviorId === behaviorId
        );
        return entry?.count ?? 0;
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

      saveSession: () => {
        const state = get();
        const session: Session = {
          id: crypto.randomUUID(),
          date: new Date(),
          notes: state.sessionNotes,
          studentIds: state.selectedStudentIds,
          sessionLengthMinutes: state.sessionLengthMinutes,
          sessionLengthOverrides: [...state.sessionLengthOverrides],
          abcEntries: [...state.abcEntries],
          frequencyEntries: [...state.frequencyEntries],
          durationEntries: [...state.durationEntries],
          intervalEntries: [...state.intervalEntries],
        };
        set((state) => ({
          sessions: [...state.sessions, session],
          currentSessionId: session.id,
        }));
        return session;
      },

      startSession: () => {
        set({ 
          sessionStartTime: new Date(),
          currentSessionId: crypto.randomUUID(),
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

      resetSessionData: () => {
        // Move current session data to trash before clearing
        const state = get();
        const now = new Date();
        
        // Add frequency entries to trash
        state.frequencyEntries.forEach((entry) => {
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

        // Add duration entries to trash
        state.durationEntries.filter(e => e.endTime).forEach((entry) => {
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

        // Add interval entries to trash (grouped by student/behavior)
        const intervalGroups = new Map<string, IntervalEntry[]>();
        state.intervalEntries.forEach((entry) => {
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

        set({
          frequencyEntries: [],
          durationEntries: [],
          intervalEntries: [],
          sessionNotes: '',
          currentSessionId: null,
          sessionStartTime: null,
          sessionLengthOverrides: [],
          sessionFocus: DEFAULT_SESSION_FOCUS,
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
    }),
    {
      name: 'behavior-data-storage',
    }
  )
);
