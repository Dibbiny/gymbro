import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updatePlanSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  durationWeeks: z.number().int().min(1).max(52).optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
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

  // Check visibility
  const isOwner = plan.creatorId === session.user.id;
  if (plan.visibility === "PRIVATE" && !isOwner) {
    // Allow if requester is an accepted follower
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

// PATCH /api/plans/[planId]
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
  if (plan.creatorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updatePlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const updated = await db.trainingPlan.update({
    where: { id: planId },
    data: parsed.data,
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

  await db.trainingPlan.delete({ where: { id: planId } });
  return NextResponse.json({ success: true });
}
