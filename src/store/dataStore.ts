import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Student, Behavior, ABCEntry, FrequencyEntry, DurationEntry, IntervalEntry, SessionConfig, STUDENT_COLORS } from '@/types/behavior';

interface DataState {
  students: Student[];
  selectedStudentIds: string[];
  abcEntries: ABCEntry[];
  frequencyEntries: FrequencyEntry[];
  durationEntries: DurationEntry[];
  intervalEntries: IntervalEntry[];
  sessionConfig: SessionConfig;
  
  // Student actions
  addStudent: (name: string) => void;
  removeStudent: (id: string) => void;
  toggleStudentSelection: (id: string) => void;
  selectAllStudents: () => void;
  deselectAllStudents: () => void;
  
  // Behavior actions
  addBehavior: (studentId: string, behavior: Omit<Behavior, 'id'>) => void;
  removeBehavior: (studentId: string, behaviorId: string) => void;
  toggleBehaviorForStudent: (studentId: string, behaviorId: string) => void;
  
  // ABC actions
  addABCEntry: (entry: Omit<ABCEntry, 'id' | 'timestamp'>) => void;
  
  // Frequency actions
  incrementFrequency: (studentId: string, behaviorId: string) => void;
  decrementFrequency: (studentId: string, behaviorId: string) => void;
  resetFrequency: (studentId: string, behaviorId: string) => void;
  getFrequencyCount: (studentId: string, behaviorId: string) => number;
  
  // Duration actions
  startDuration: (studentId: string, behaviorId: string) => void;
  stopDuration: (studentId: string, behaviorId: string) => number;
  getActiveDuration: (studentId: string, behaviorId: string) => DurationEntry | undefined;
  
  // Interval actions
  recordInterval: (studentId: string, behaviorId: string, intervalNumber: number, occurred: boolean) => void;
  getIntervalData: (studentId: string, behaviorId: string) => IntervalEntry[];
  
  // Session config
  updateSessionConfig: (config: Partial<SessionConfig>) => void;
  
  // Reset
  resetAllData: () => void;
  resetSessionData: () => void;
}

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

      addBehavior: (studentId, behavior) => {
        const id = crypto.randomUUID();
        set((state) => ({
          students: state.students.map((s) =>
            s.id === studentId
              ? { ...s, behaviors: [...s.behaviors, { ...behavior, id }] }
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
            { ...entry, id: crypto.randomUUID(), timestamp: new Date() },
          ],
        }));
      },

      incrementFrequency: (studentId, behaviorId) => {
        set((state) => {
          const existing = state.frequencyEntries.find(
            (e) => e.studentId === studentId && e.behaviorId === behaviorId
          );
          if (existing) {
            return {
              frequencyEntries: state.frequencyEntries.map((e) =>
                e.studentId === studentId && e.behaviorId === behaviorId
                  ? { ...e, count: e.count + 1 }
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
                timestamp: new Date(),
              },
            ],
          };
        });
      },

      decrementFrequency: (studentId, behaviorId) => {
        set((state) => ({
          frequencyEntries: state.frequencyEntries.map((e) =>
            e.studentId === studentId && e.behaviorId === behaviorId && e.count > 0
              ? { ...e, count: e.count - 1 }
              : e
          ),
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
        });
      },
    }),
    {
      name: 'behavior-data-storage',
    }
  )
);
