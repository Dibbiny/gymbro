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
              exercise: { select: { id: true, name: true, categories: { select: { name: true } }, description: true, demoUrl: true } },
            },
          },
        },
      },
      setLogs: {
        select: { exerciseId: true, setNumber: true, weightKg: true, repsCompleted: true },
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

  if (trainingSession.planDay) {
    exercises = trainingSession.planDay.planDayExercises.map((pde) => ({
      planDayExerciseId: pde.id,
      exerciseId: pde.exercise.id,
      exerciseName: pde.exercise.name,
      categories: pde.exercise.categories.map((c) => c.name),
      description: pde.exercise.description,
      demoUrl: pde.exercise.demoUrl,
      sets: pde.sets,
      reps: pde.reps,
      restSeconds: pde.restSeconds,
      orderIndex: pde.orderIndex,
    }));
    planDayLabel = trainingSession.planDay.label;
  } else if (trainingSession.notes) {
    // Random day — exercises embedded in notes JSON
    try {
      const parsed = JSON.parse(trainingSession.notes);
      if (parsed.randomDay && Array.isArray(parsed.exercises)) {
        isRandomDay = true;
        const parsedExercises: { exerciseId: string; sets: number; reps: number; restSeconds: number; orderIndex: number; }[] = parsed.exercises;
        const exerciseIds = parsedExercises.map((e) => e.exerciseId);
        const exerciseRows = await db.exercise.findMany({
          where: { id: { in: exerciseIds } },
          select: { id: true, name: true, categories: { select: { name: true } }, description: true, demoUrl: true },
        });
        const exerciseMap = new Map(exerciseRows.map((ex) => [ex.id, ex]));
        exercises = parsedExercises.map((e) => {
          const ex = exerciseMap.get(e.exerciseId);
          return {
            planDayExerciseId: `random-${e.exerciseId}`,
            exerciseId: e.exerciseId,
            exerciseName: ex?.name ?? "Unknown",
            categories: ex?.categories?.map((c) => c.name) ?? [],
            description: ex?.description,
            demoUrl: ex?.demoUrl,
            sets: e.sets,
            reps: e.reps,
            restSeconds: e.restSeconds,
            orderIndex: e.orderIndex,
          } as ExerciseEntry;
        });
        planDayLabel = "Random Day";
      }
    } catch {}
  }

  return (
    <SessionClient
      sessionId={sessionId}
      exercises={exercises}
      planDayLabel={planDayLabel}
      isRandomDay={isRandomDay}
      preloadedLogs={preloadedLogs}
      pausedDuration={pausedDuration}
    />
  );
}
