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
  STUDENT_COLORS 
} from '@/types/behavior';

interface CollapsedState {
  methods: { [studentId: string]: DataCollectionMethod[] }; // collapsed method sections
  behaviors: { [key: string]: boolean }; // studentId-behaviorId -> collapsed
}

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
  
  // Student actions
  addStudent: (name: string) => void;
  removeStudent: (id: string) => void;
  toggleStudentSelection: (id: string) => void;
  selectAllStudents: () => void;
  deselectAllStudents: () => void;
  addCustomAntecedent: (studentId: string, antecedent: string) => void;
  addCustomConsequence: (studentId: string, consequence: string) => void;
  getStudentAntecedents: (studentId: string) => string[];
  getStudentConsequences: (studentId: string) => string[];
  
  // Behavior actions
  addBehavior: (studentId: string, behavior: Omit<Behavior, 'id'>) => void;
  addBehaviorWithMethods: (studentId: string, name: string, methods: DataCollectionMethod[]) => void;
  updateBehaviorMethods: (studentId: string, behaviorId: string, methods: DataCollectionMethod[]) => void;
  removeBehavior: (studentId: string, behaviorId: string) => void;
  toggleBehaviorForStudent: (studentId: string, behaviorId: string) => void;
  
  // ABC actions
  addABCEntry: (entry: Omit<ABCEntry, 'id' | 'timestamp'>) => void;
  addEnhancedABCEntry: (entry: Omit<ABCEntry, 'id' | 'timestamp'>) => void;
  
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
  
  // Reset
  resetAllData: () => void;
  resetSessionData: () => void;
}

const DEFAULT_TRACKER_ORDER: DataCollectionMethod[] = ['frequency', 'duration', 'interval', 'abc'];

export const useDataStore = create<DataState>()(
  persist(
    (set, get) => ({
      students: [],
      selectedStudentIds: [],
      abcEntries: [],
      frequencyEntries: [],
      durationEntries: [],
      intervalEntries: [],
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
      sessionFocus: { enabled: false, activeBehaviors: {}, activeMethods: {}, studentMethods: {} },

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
          const current = state.sessionFocus.studentMethods[studentId];
          // If no custom methods set, start with all methods
          const allMethods: DataCollectionMethod[] = ['frequency', 'duration', 'interval', 'abc'];
          const activeMethods = current || allMethods;
          
          const newMethods = activeMethods.includes(method)
            ? activeMethods.filter(m => m !== method)
            : [...activeMethods, method];
          
          return {
            sessionFocus: {
              ...state.sessionFocus,
              studentMethods: {
                ...state.sessionFocus.studentMethods,
                [studentId]: newMethods,
              },
            },
          };
        });
      },

      isStudentMethodActive: (studentId, method) => {
        const state = get();
        const studentMethods = state.sessionFocus.studentMethods[studentId];
        // If no custom filter set, all methods are active
        if (!studentMethods) return true;
        return studentMethods.includes(method);
      },

      getActiveStudentMethods: (studentId) => {
        const state = get();
        const allMethods: DataCollectionMethod[] = ['frequency', 'duration', 'interval', 'abc'];
        return state.sessionFocus.studentMethods[studentId] || allMethods;
      },

      resetStudentMethods: (studentId) => {
        set((state) => {
          const newStudentMethods = { ...state.sessionFocus.studentMethods };
          delete newStudentMethods[studentId];
          return {
            sessionFocus: {
              ...state.sessionFocus,
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
        set({
          frequencyEntries: [],
          durationEntries: [],
          intervalEntries: [],
          sessionNotes: '',
          currentSessionId: null,
          sessionStartTime: null,
          sessionLengthOverrides: [],
          sessionFocus: { enabled: false, activeBehaviors: {}, activeMethods: {}, studentMethods: {} },
        });
      },
    }),
    {
      name: 'behavior-data-storage',
    }
  )
);
