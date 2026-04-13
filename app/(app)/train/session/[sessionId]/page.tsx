import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { SessionClient } from "./SessionClient";
import type { ExerciseEntry, PreloadedSetLog } from "@/store/trainingSession";

interface Props {
  params: Promise<{ sessionId: string }>;
}

export default async function SessionPage({ params }: Props) {
  const session = await auth();
  const { sessionId } = await params;

  const trainingSession = await db.trainingSession.findUnique({
    where: { id: sessionId },
    include: {
      planDay: {
        include: {
          planDayExercises: {
            orderBy: { orderIndex: "asc" },
            include: {
              exercise: { select: { id: true, name: true, movementTypes: true, muscleGroups: true, description: true, demoUrl: true } },
            },
          },
        },
      },
      setLogs: {
        select: { exerciseId: true, setNumber: true, weightKg: true, repsCompleted: true, notes: true },
        orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }],
      },
    },
  });

  if (!trainingSession) notFound();
  if (trainingSession.userId !== session!.user.id) notFound();
  if (trainingSession.completedAt) redirect("/train");

  let exercises: ExerciseEntry[] = [];
  let planDayLabel: string | null = null;
  let isRandomDay = false;
  const preloadedLogs: PreloadedSetLog[] = trainingSession.setLogs;
  const pausedDuration = trainingSession.pausedDuration;
  const sessionNotes = trainingSession.notes;

  if (trainingSession.planDay) {
    exercises = trainingSession.planDay.planDayExercises.map((pde: any) => ({
      planDayExerciseId: pde.id,
      exerciseId: pde.exercise.id,
      exerciseName: pde.exercise.name,
      movementTypes: pde.exercise.movementTypes,
      muscleGroups: pde.exercise.muscleGroups,
      description: pde.exercise.description,
      demoUrl: pde.exercise.demoUrl,
      sets: pde.sets,
      reps: pde.reps,
      restSeconds: pde.restSeconds,
      orderIndex: pde.orderIndex,
    }));
    planDayLabel = trainingSession.planDay.label;
  } else if (trainingSession.notes) {
    // Random day or free training — exercises embedded in notes JSON
    try {
      const parsed = JSON.parse(trainingSession.notes);
      const isFree = parsed.freeTraining === true;
      const isRandom = parsed.randomDay === true;
      if ((isFree || isRandom) && Array.isArray(parsed.exercises)) {
        isRandomDay = isRandom;
        const parsedExercises: { exerciseId: string; exerciseName?: string; sets: number; reps: number; restSeconds: number; orderIndex: number; }[] = parsed.exercises;
        const exerciseIds = parsedExercises.map((e: any) => e.exerciseId);
        const exerciseRows = await db.exercise.findMany({
          where: { id: { in: exerciseIds } },
          select: { id: true, name: true, movementTypes: true, muscleGroups: true, description: true, demoUrl: true },
        });
        const exerciseMap = new Map(exerciseRows.map((ex: any) => [ex.id, ex]));
        exercises = parsedExercises.map((e: any) => {
          const ex = exerciseMap.get(e.exerciseId) as any;
          return {
            planDayExerciseId: `${isFree ? "free" : "random"}-${e.exerciseId}`,
            exerciseId: e.exerciseId,
            exerciseName: ex?.name ?? e.exerciseName ?? "Unknown",
            movementTypes: ex?.movementTypes ?? [],
            muscleGroups: ex?.muscleGroups ?? [],
            description: ex?.description,
            demoUrl: ex?.demoUrl,
            sets: e.sets,
            reps: e.reps,
            restSeconds: e.restSeconds,
            orderIndex: e.orderIndex,
          } as ExerciseEntry;
        });
        planDayLabel = isFree ? "Custom Workout" : "Random Day";
      }
    } catch {}
  }

  // Merge any exercises added mid-session (stored as extraExercises in notes)
  try {
    if (trainingSession.notes) {
      const parsed = JSON.parse(trainingSession.notes);
      if (Array.isArray(parsed.extraExercises) && parsed.extraExercises.length > 0) {
        const extraIds = parsed.extraExercises.map((e: any) => e.exerciseId);
        const existingIds = new Set(exercises.map((e) => e.exerciseId));
        const newIds = extraIds.filter((id: string) => !existingIds.has(id));
        if (newIds.length > 0) {
          const extraRows = await db.exercise.findMany({
            where: { id: { in: newIds } },
            select: { id: true, name: true, movementTypes: true, muscleGroups: true, description: true, demoUrl: true },
          });
          const extraMap = new Map(extraRows.map((r: any) => [r.id, r]));
          const extraEntries: ExerciseEntry[] = parsed.extraExercises
            .filter((e: any) => !existingIds.has(e.exerciseId))
            .map((e: any, idx: number) => {
              const row = extraMap.get(e.exerciseId) as any;
              return {
                planDayExerciseId: `extra-${e.exerciseId}`,
                exerciseId: e.exerciseId,
                exerciseName: row?.name ?? e.exerciseName ?? "Unknown",
                movementTypes: row?.movementTypes ?? [],
                muscleGroups: row?.muscleGroups ?? [],
                description: row?.description,
                demoUrl: row?.demoUrl,
                sets: e.sets ?? 3,
                reps: e.reps ?? 10,
                restSeconds: e.restSeconds ?? 90,
                orderIndex: exercises.length + idx,
              };
            });
          exercises = [...exercises, ...extraEntries];
        }
      }
    }
  } catch {}

  return (
    <SessionClient
      sessionId={sessionId}
      exercises={exercises}
      planDayLabel={planDayLabel}
      isRandomDay={isRandomDay}
      preloadedLogs={preloadedLogs}
      pausedDuration={pausedDuration}
      sessionNotes={sessionNotes}
    />
  );
}
