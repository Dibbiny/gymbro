import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { PlanBuilder } from "@/components/plans/PlanBuilder";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

interface Props {
  params: Promise<{ planId: string }>;
}

export default async function EditPlanPage({ params }: Props) {
  const session = await auth();
  const { planId } = await params;

  const plan = await db.trainingPlan.findUnique({
    where: { id: planId },
    include: {
      planDays: {
        orderBy: [{ weekNumber: "asc" }, { dayOfWeek: "asc" }],
        include: {
          planDayExercises: { orderBy: { orderIndex: "asc" } },
        },
      },
    },
  });

  if (!plan) notFound();
  if (plan.creatorId !== session!.user.id) redirect(`/plans/${planId}`);

  const initialData = {
    title: plan.title,
    description: plan.description ?? "",
    durationWeeks: plan.durationWeeks,
    visibility: plan.visibility as "PUBLIC" | "PRIVATE",
    days: plan.planDays.map((day: any) => ({
      dayOfWeek: day.dayOfWeek,
      weekNumber: day.weekNumber,
      label: day.label ?? "",
      exercises: day.planDayExercises.map((ex: any) => ({
        exerciseId: ex.exerciseId,
        orderIndex: ex.orderIndex,
        sets: ex.sets,
        reps: ex.reps,
        restSeconds: ex.restSeconds,
      })),
    })),
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href={`/plans/${planId}`} className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Edit Plan</h1>
      </div>
      <PlanBuilder planId={planId} initialData={initialData} />
    </div>
  );
}
