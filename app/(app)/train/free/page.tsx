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

  if (again) {
    const session = await auth();
    const prev = await db.trainingSession.findFirst({
      where: { id: again, userId: session!.user.id },
      select: { notes: true },
    });
    if (prev?.notes) {
      try {
        const parsed = JSON.parse(prev.notes);
        if (
          (parsed.freeTraining === true || parsed.randomDay === true) &&
          Array.isArray(parsed.exercises)
        ) {
          initialExercises = parsed.exercises.map(
            (e: any, i: number) => ({
              exerciseId: e.exerciseId,
              exerciseName: e.exerciseName ?? e.exerciseId,
              sets: e.sets ?? 3,
              reps: e.reps ?? 10,
              restSeconds: e.restSeconds ?? 90,
              orderIndex: i,
            })
          );
        }
      } catch {}
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/train" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Custom Workout</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Add exercises one by one and track your sets, reps, and weights in real time.
      </p>
      <FreeTrainingBuilder initialExercises={initialExercises} />
    </div>
  );
}
