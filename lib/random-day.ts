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
  totalSets: number
): GeneratedExercise[] {
  // Sample proportionally across muscle groups so no single group dominates
  const byMuscleGroup = new Map<string, ExerciseRow[]>();
  for (const ex of exercises) {
    const group = ex.muscleGroups[0] ?? "OTHER";
    if (!byMuscleGroup.has(group)) byMuscleGroup.set(group, []);
    byMuscleGroup.get(group)!.push(ex);
  }

  const selected: ExerciseRow[] = [];
  for (const groupExercises of byMuscleGroup.values()) {
    selected.push(...shuffle(groupExercises).slice(0, 2));
  }
  const pool = shuffle(selected);

  if (pool.length === 0) return [];

  const SETS_PER_EXERCISE = 3;
  const maxExercises = Math.ceil(totalSets / SETS_PER_EXERCISE);
  const picked = pool.slice(0, maxExercises);

  const result: GeneratedExercise[] = [];
  let setsLeft = totalSets;

  for (let i = 0; i < picked.length; i++) {
    const ex = picked[i];
    const isLast = i === picked.length - 1;
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
