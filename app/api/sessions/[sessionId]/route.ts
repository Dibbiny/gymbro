import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { awardXP } from "@/lib/xp";

const updateSchema = z.object({
  pausedDuration: z.number().int().min(0).optional(),
  notes: z.string().max(1000).optional(),
});

// GET /api/sessions/[sessionId]
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await params;

  const trainingSession = await db.trainingSession.findUnique({
    where: { id: sessionId },
    include: {
      planDay: {
        include: {
          planDayExercises: {
            orderBy: { orderIndex: "asc" },
            include: { exercise: true },
          },
        },
      },
      setLogs: { orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }] },
    },
  });

  if (!trainingSession) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (trainingSession.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ session: trainingSession });
}

// PATCH /api/sessions/[sessionId] — update paused duration
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await params;

  const existing = await db.trainingSession.findUnique({
    where: { id: sessionId },
    select: { userId: true, completedAt: true },
  });

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (existing.completedAt) {
    return NextResponse.json({ error: "Session already completed" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const updated = await db.trainingSession.update({
    where: { id: sessionId },
    data: parsed.data,
  });

  return NextResponse.json({ session: updated });
}

// POST /api/sessions/[sessionId]/complete — finish the session
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await params;

  const trainingSession = await db.trainingSession.findUnique({
    where: { id: sessionId },
    include: {
      setLogs: true,
      enrollment: { include: { plan: { include: { planDays: true } } } },
    },
  });

  if (!trainingSession) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (trainingSession.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (trainingSession.completedAt) {
    return NextResponse.json({ session: trainingSession });
  }

  const body = await request.json().catch(() => ({}));
  const notes: string | undefined = body?.notes;

  // Check if this completes the whole plan
  let planCompleted = false;
  if (trainingSession.enrollmentId && trainingSession.enrollment) {
    const enrollment = trainingSession.enrollment;
    const totalPlanDays = enrollment.plan.planDays.length;

    const completedSessions = await db.trainingSession.count({
      where: {
        enrollmentId: enrollment.id,
        completedAt: { not: null },
        id: { not: sessionId }, // exclude current (not yet marked)
      },
    });

    if (completedSessions + 1 >= totalPlanDays) {
      planCompleted = true;
    }
  }

  const xpEarned = awardXP(trainingSession.setLogs.length);

  await db.$transaction(async (tx) => {
    await tx.trainingSession.update({
      where: { id: sessionId },
      data: { completedAt: new Date(), notes: notes ?? null },
    });

    await tx.user.update({
      where: { id: session.user.id },
      data: { experiencePoints: { increment: xpEarned } },
    });

    if (planCompleted && trainingSession.enrollmentId) {
      await tx.planEnrollment.update({
        where: { id: trainingSession.enrollmentId },
        data: { isActive: false, completedAt: new Date() },
      });
    }
  });

  return NextResponse.json({ xpEarned, planCompleted });
}
