import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const enrollSchema = z.object({
  startDate: z.string().datetime(),
});

// POST /api/plans/[planId]/enroll
export async function POST(
  request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { planId } = await params;

  const plan = await db.trainingPlan.findUnique({
    where: { id: planId },
    select: { id: true, visibility: true, creatorId: true },
  });

  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Private plans: only creator or accepted followers can enroll
  if (plan.visibility === "PRIVATE" && plan.creatorId !== session.user.id) {
    const follow = await db.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: session.user.id,
          followingId: plan.creatorId,
        },
      },
    });
    if (!follow || follow.status !== "ACCEPTED") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await request.json();
  const parsed = enrollSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const existing = await db.planEnrollment.findUnique({
    where: { userId_planId: { userId: session.user.id, planId } },
  });

  if (existing) {
    // Re-activate if previously completed
    const enrollment = await db.planEnrollment.update({
      where: { userId_planId: { userId: session.user.id, planId } },
      data: { isActive: true, completedAt: null, startDate: new Date(parsed.data.startDate) },
    });
    return NextResponse.json({ enrollment });
  }

  const enrollment = await db.planEnrollment.create({
    data: {
      userId: session.user.id,
      planId,
      startDate: new Date(parsed.data.startDate),
    },
  });

  return NextResponse.json({ enrollment }, { status: 201 });
}

// DELETE /api/plans/[planId]/enroll — unenroll
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { planId } = await params;

  await db.planEnrollment.updateMany({
    where: { userId: session.user.id, planId },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
