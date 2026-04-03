import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { SessionClient } from "./SessionClient";
import type { ExerciseEntry } from "@/store/trainingSession";

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
              exercise: { select: { id: true, name: true, category: true } },
            },
          },
        },
      },
    },
  });

  if (!trainingSession) notFound();
  if (trainingSession.userId !== session!.user.id) notFound();
  if (trainingSession.completedAt) redirect("/train");

  let exercises: ExerciseEntry[] = [];
  let planDayLabel: string | null = null;
  let isRandomDay = false;

  if (trainingSession.planDay) {
    exercises = trainingSession.planDay.planDayExercises.map((pde) => ({
      planDayExerciseId: pde.id,
      exerciseId: pde.exercise.id,
      exerciseName: pde.exercise.name,
      category: pde.exercise.category,
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
        exercises = await Promise.all(
          parsed.exercises.map(async (e: {
            exerciseId: string; sets: number; reps: number;
            restSeconds: number; orderIndex: number;
          }) => {
            const ex = await db.exercise.findUnique({
              where: { id: e.exerciseId },
              select: { id: true, name: true, category: true },
            });
            return {
              planDayExerciseId: `random-${e.exerciseId}`,
              exerciseId: e.exerciseId,
              exerciseName: ex?.name ?? "Unknown",
              category: ex?.category ?? "UPPER_BODY",
              sets: e.sets,
              reps: e.reps,
              restSeconds: e.restSeconds,
              orderIndex: e.orderIndex,
            } as ExerciseEntry;
          })
        );
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
    />
  );
}
