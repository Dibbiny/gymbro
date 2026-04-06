import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const exerciseEntrySchema = z.object({
  exerciseId: z.string().min(1),
  orderIndex: z.number(),
  sets: z.number().int().min(1).max(100),
  reps: z.number().int().min(1).max(1000),
  restSeconds: z.number().int().min(0).max(600),
});

const planDaySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  weekNumber: z.number().int().min(1),
  label: z.string().max(50).optional(),
  exercises: z.array(exerciseEntrySchema),
});

const updatePlanSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  durationWeeks: z.number().int().min(1).max(52),
  visibility: z.enum(["PUBLIC", "PRIVATE"]),
  days: z.array(planDaySchema),
});

// GET /api/plans/[planId]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { planId } = await params;

  const plan = await db.trainingPlan.findUnique({
    where: { id: planId },
    include: {
      creator: { select: { id: true, username: true, avatarUrl: true } },
      planDays: {
        orderBy: [{ weekNumber: "asc" }, { dayOfWeek: "asc" }],
        include: {
          planDayExercises: {
            orderBy: { orderIndex: "asc" },
            include: { exercise: true },
          },
        },
      },
      planRatings: {
        where: { userId: session.user.id },
        select: { rating: true },
      },
      _count: { select: { planEnrollments: true } },
    },
  });

  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = plan.creatorId === session.user.id;
  if (plan.visibility === "PRIVATE" && !isOwner) {
    const follow = await db.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: session.user.id,
          followingId: plan.creatorId,
        },
      },
    });
    if (!follow || follow.status !== "ACCEPTED") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  return NextResponse.json({ plan });
}

// PATCH /api/plans/[planId] — full update (replaces days)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { planId } = await params;

  const plan = await db.trainingPlan.findUnique({
    where: { id: planId },
    select: { creatorId: true },
  });

  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (plan.creatorId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updatePlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { title, description, durationWeeks, visibility, days } = parsed.data;

  const updated = await db.$transaction(async (tx) => {
    // Update plan metadata
    const updatedPlan = await tx.trainingPlan.update({
      where: { id: planId },
      data: { title, description, durationWeeks, visibility },
    });

    // Replace all plan days
    await tx.planDay.deleteMany({ where: { planId } });

    for (const day of days) {
      await tx.planDay.create({
        data: {
          planId,
          dayOfWeek: day.dayOfWeek,
          weekNumber: day.weekNumber,
          label: day.label ?? null,
          planDayExercises: {
            create: day.exercises.map((ex: any) => ({
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

    return updatedPlan;
  });

  return NextResponse.json({ plan: updated });
}

// DELETE /api/plans/[planId]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { planId } = await params;

  const plan = await db.trainingPlan.findUnique({
    where: { id: planId },
    select: { creatorId: true },
  });

  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (plan.creatorId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.$transaction(async (tx) => {
    const enrollments = await tx.planEnrollment.findMany({
      where: { planId },
      select: { id: true },
    });
    const enrollmentIds = enrollments.map((e: any) => e.id);

    // Detach sessions from the enrollment + plan day (keep history intact)
    await tx.trainingSession.updateMany({
      where: { enrollmentId: { in: enrollmentIds } },
      data: { enrollmentId: null, planDayId: null },
    });

    // Detach posts from the enrollment (keep posts intact)
    await tx.post.updateMany({
      where: { enrollmentId: { in: enrollmentIds } },
      data: { enrollmentId: null },
    });

    // Delete plan ratings and enrollments
    await tx.planRating.deleteMany({ where: { planId } });
    await tx.planEnrollment.deleteMany({ where: { planId } });

    // Delete the plan (plan days + exercises cascade)
    await tx.trainingPlan.delete({ where: { id: planId } });
  });

  return NextResponse.json({ success: true });
}
