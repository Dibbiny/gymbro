import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { FreeTrainingBuilder } from "@/components/training/FreeTrainingBuilder";

interface Props {
  searchParams: Promise<{ again?: string }>;
}

export default async function FreeTrainingPage({ searchParams }: Props) {
  const { again } = await searchParams;

  let initialExercises: {
    exerciseId: string;
    exerciseName: string;
    sets: number;
    reps: number;
    restSeconds: number;
    orderIndex: number;
  }[] = [];
  let initialName = "";

  if (again) {
    const session = await auth();
    const prev = await db.trainingSession.findFirst({
      where: { id: again, userId: session!.user.id },
      include: {
        planDay: {
          include: {
            planDayExercises: {
              orderBy: { orderIndex: "asc" },
              include: { exercise: { select: { id: true, name: true } } },
            },
          },
        },
        setLogs: {
          orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }],
          include: { exercise: { select: { id: true, name: true } } },
        },
      },
    });

    if (prev) {
      if (prev.planDay) {
        // Planned session — pull exercises from the plan day
        initialExercises = prev.planDay.planDayExercises.map((pde: any, i: number) => ({
          exerciseId: pde.exercise.id,
          exerciseName: pde.exercise.name,
          sets: pde.sets,
          reps: pde.reps,
          restSeconds: pde.restSeconds,
          orderIndex: i,
        }));
      } else if (prev.notes) {
        // Free / random session — rebuild from notes JSON (preserves target sets/reps/rest)
        try {
          const parsed = JSON.parse(prev.notes);
          if (parsed.workoutName) initialName = parsed.workoutName;
          const allExercises = [
            ...(Array.isArray(parsed.exercises) ? parsed.exercises : []),
            ...(Array.isArray(parsed.extraExercises) ? parsed.extraExercises : []),
          ];
          if (allExercises.length > 0) {
            const ids = allExercises.map((e: any) => e.exerciseId);
            const rows = await db.exercise.findMany({
              where: { id: { in: ids } },
              select: { id: true, name: true },
            });
            const nameMap = new Map(rows.map((r: any) => [r.id, r.name]));
            // Dedupe by exerciseId (extras may overlap with originals)
            const seen = new Set<string>();
            initialExercises = allExercises
              .filter((e: any) => {
                if (seen.has(e.exerciseId)) return false;
                seen.add(e.exerciseId);
                return true;
              })
              .map((e: any, i: number) => ({
                exerciseId: e.exerciseId,
                exerciseName: nameMap.get(e.exerciseId) ?? e.exerciseName ?? e.exerciseId,
                sets: e.sets ?? 3,
                reps: e.reps ?? 10,
                restSeconds: e.restSeconds ?? 90,
                orderIndex: i,
              }));
          }
        } catch {}
      }

      // Fallback: rebuild from set logs if still empty (handles plan sessions where plan was deleted)
      if (initialExercises.length === 0 && prev.setLogs.length > 0) {
        const byExercise = new Map<string, { name: string; sets: number; reps: number }>();
        for (const log of prev.setLogs as any[]) {
          const existing = byExercise.get(log.exerciseId);
          if (!existing) {
            byExercise.set(log.exerciseId, {
              name: log.exercise.name,
              sets: log.setNumber,
              reps: log.repsCompleted,
            });
          } else {
            existing.sets = Math.max(existing.sets, log.setNumber);
            existing.reps = log.repsCompleted; // use last set's reps
          }
        }
        initialExercises = Array.from(byExercise.entries()).map(([exerciseId, data], i) => ({
          exerciseId,
          exerciseName: data.name,
          sets: data.sets,
          reps: data.reps,
          restSeconds: 90,
          orderIndex: i,
        }));
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/train" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">
          {initialExercises.length > 0 ? "Train again" : "Custom Workout"}
        </h1>
      </div>
      {initialExercises.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Add exercises one by one and track your sets, reps, and weights in real time.
        </p>
      )}
      <FreeTrainingBuilder initialExercises={initialExercises} initialName={initialName} />
    </div>
  );
}
