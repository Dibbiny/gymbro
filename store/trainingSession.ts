import { create } from "zustand";

export interface ExerciseEntry {
  planDayExerciseId: string;
  exerciseId: string;
  exerciseName: string;
  categories: string[];
  sets: number;
  reps: number;
  restSeconds: number;
  orderIndex: number;
  description?: string | null;
  demoUrl?: string | null;
}

export interface SetLogEntry {
  exerciseId: string;
  setNumber: number;
  weightKg: number | null;
  repsCompleted: number;
  notes?: string | null;
  saved: boolean;
}

export interface PreloadedSetLog {
  exerciseId: string;
  setNumber: number;
  weightKg: number | null;
  repsCompleted: number;
  notes?: string | null;
}

interface TrainingSessionState {
  sessionId: string | null;
  exercises: ExerciseEntry[];
  currentExerciseIndex: number;
  currentSet: number; // 1-based, which set of the current exercise
  setLogs: SetLogEntry[];
  isPaused: boolean;
  isResting: boolean;
  restSecondsLeft: number;
  elapsedSeconds: number;

  // Actions
  initSession: (sessionId: string, exercises: ExerciseEntry[]) => void;
  resumeSession: (
    sessionId: string,
    exercises: ExerciseEntry[],
    preloadedLogs: PreloadedSetLog[],
    elapsedSeconds: number
  ) => void;
  setElapsed: (seconds: number) => void;
  setPaused: (paused: boolean) => void;
  startRest: () => void;
  tickRest: () => void;
  stopRest: () => void;
  logSet: (entry: SetLogEntry) => void;
  markSetSaved: (exerciseId: string, setNumber: number) => void;
  advanceSet: () => void; // move to next set or next exercise
  reset: () => void;
}

export const useTrainingSession = create<TrainingSessionState>((set, get) => ({
  sessionId: null,
  exercises: [],
  currentExerciseIndex: 0,
  currentSet: 1,
  setLogs: [],
  isPaused: false,
  isResting: false,
  restSecondsLeft: 0,
  elapsedSeconds: 0,

  initSession: (sessionId, exercises) =>
    set({
      sessionId,
      exercises,
      currentExerciseIndex: 0,
      currentSet: 1,
      setLogs: [],
      isPaused: false,
      isResting: false,
      restSecondsLeft: 0,
      elapsedSeconds: 0,
    }),

  resumeSession: (sessionId, exercises, preloadedLogs, elapsedSeconds) => {
    const setLogs: SetLogEntry[] = preloadedLogs.map((l) => ({ ...l, saved: true }));

    // Find the first exercise that isn't fully done
    let currentExerciseIndex = exercises.length - 1;
    let currentSet = exercises[exercises.length - 1]?.sets ?? 1;

    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];
      const completedSets = setLogs.filter((l) => l.exerciseId === ex.exerciseId).length;
      if (completedSets < ex.sets) {
        currentExerciseIndex = i;
        currentSet = completedSets + 1;
        break;
      }
    }

    set({
      sessionId,
      exercises,
      currentExerciseIndex,
      currentSet,
      setLogs,
      isPaused: false,
      isResting: false,
      restSecondsLeft: 0,
      elapsedSeconds,
    });
  },

  setElapsed: (seconds) => set({ elapsedSeconds: seconds }),

  setPaused: (paused) => set({ isPaused: paused }),

  startRest: () => {
    const ex = get().exercises[get().currentExerciseIndex];
    set({ isResting: true, restSecondsLeft: ex?.restSeconds ?? 90 });
  },

  tickRest: () => {
    const { restSecondsLeft } = get();
    if (restSecondsLeft <= 1) {
      set({ isResting: false, restSecondsLeft: 0 });
    } else {
      set({ restSecondsLeft: restSecondsLeft - 1 });
    }
  },

  stopRest: () => set({ isResting: false, restSecondsLeft: 0 }),

  logSet: (entry) => {
    const logs = get().setLogs.filter(
      (l) => !(l.exerciseId === entry.exerciseId && l.setNumber === entry.setNumber)
    );
    set({ setLogs: [...logs, entry] });
  },

  markSetSaved: (exerciseId, setNumber) =>
    set((state) => ({
      setLogs: state.setLogs.map((l) =>
        l.exerciseId === exerciseId && l.setNumber === setNumber ? { ...l, saved: true } : l
      ),
    })),

  advanceSet: () => {
    const { currentExerciseIndex, currentSet, exercises } = get();
    const exercise = exercises[currentExerciseIndex];
    if (!exercise) return;

    if (currentSet < exercise.sets) {
      set({ currentSet: currentSet + 1 });
    } else if (currentExerciseIndex < exercises.length - 1) {
      set({ currentExerciseIndex: currentExerciseIndex + 1, currentSet: 1 });
    }
    // if last set of last exercise, stay — user finishes manually
  },

  reset: () =>
    set({
      sessionId: null,
      exercises: [],
      currentExerciseIndex: 0,
      currentSet: 1,
      setLogs: [],
      isPaused: false,
      isResting: false,
      restSecondsLeft: 0,
      elapsedSeconds: 0,
    }),
}));
