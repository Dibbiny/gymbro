import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/plans/[planId]/clone — creates a private copy for the current user
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { planId } = await params;

  const source = await db.trainingPlan.findUnique({
    where: { id: planId },
    include: {
      planDays: {
        include: {
          planDayExercises: { orderBy: { orderIndex: "asc" } },
        },
      },
    },
  });

  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (source.visibility === "PRIVATE" && source.creatorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const clone = await db.$transaction(async (tx) => {
    const newPlan = await tx.trainingPlan.create({
      data: {
        creatorId: session.user.id,
        title: `Copy of ${source.title}`,
        description: source.description,
        durationWeeks: source.durationWeeks,
        visibility: "PRIVATE",
      },
    });

    for (const day of source.planDays) {
      await tx.planDay.create({
        data: {
          planId: newPlan.id,
          dayOfWeek: day.dayOfWeek,
          weekNumber: day.weekNumber,
          label: day.label,
          planDayExercises: {
            create: day.planDayExercises.map((ex: any) => ({
              exerciseId: ex.exerciseId,
              orderIndex: ex.orderIndex,
              sets: ex.sets,
              reps: ex.reps,
              restSeconds: ex.restSeconds,
            })),
          },
        },
      });
    }

    return newPlan;
  });

  return NextResponse.json({ plan: clone }, { status: 201 });
}
