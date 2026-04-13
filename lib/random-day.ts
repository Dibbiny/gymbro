export type FocusType = "FULL_BODY" | "UPPER_BODY" | "LOWER_BODY" | "PULL" | "PUSH" | "LEGS";

interface ExerciseRow {
  id: string;
  name: string;
  movementTypes: string[];
  muscleGroups: string[];
}

interface GeneratedExercise {
  exerciseId: string;
  exerciseName: string;
  movementTypes: string[];
  muscleGroups: string[];
  sets: number;
  reps: number;
  restSeconds: number;
  orderIndex: number;
}

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateRandomDay(
  exercises: ExerciseRow[],
  focus: FocusType,
  totalSets: number
): GeneratedExercise[] {
  // Filter by focus
  let pool: ExerciseRow[];

  if (focus === "FULL_BODY") {
    // Sample from all muscle groups proportionally
    const byMuscleGroup = new Map<string, ExerciseRow[]>();
    for (const ex of exercises) {
      const group = ex.muscleGroups[0] ?? "OTHER";
      if (!byMuscleGroup.has(group)) byMuscleGroup.set(group, []);
      byMuscleGroup.get(group)!.push(ex);
    }
    // Pick up to 2 exercises from each muscle group
    const selected: ExerciseRow[] = [];
    for (const groupExercises of byMuscleGroup.values()) {
      selected.push(...shuffle(groupExercises).slice(0, 2));
    }
    pool = shuffle(selected);
  } else {
    pool = shuffle(exercises);
  }

  if (pool.length === 0) return [];

  // Distribute sets across exercises (3 sets per exercise by default, min 1)
  const SETS_PER_EXERCISE = 3;
  const maxExercises = Math.ceil(totalSets / SETS_PER_EXERCISE);
  const selected = pool.slice(0, maxExercises);

  const result: GeneratedExercise[] = [];
  let setsLeft = totalSets;

  for (let i = 0; i < selected.length; i++) {
    const ex = selected[i];
    const isLast = i === selected.length - 1;
    const sets = isLast ? setsLeft : Math.min(SETS_PER_EXERCISE, setsLeft);
    if (sets <= 0) break;

    result.push({
      exerciseId: ex.id,
      exerciseName: ex.name,
      movementTypes: ex.movementTypes,
      muscleGroups: ex.muscleGroups,
      sets,
      reps: randInt(8, 12),
      restSeconds: 90,
      orderIndex: i,
    });
    setsLeft -= sets;
  }

  return result;
}
