import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const rateSchema = z.object({
  rating: z.number().int().min(1).max(5),
});

// POST /api/plans/[planId]/rate
export async function POST(
  request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { planId } = await params;

  const plan = await db.trainingPlan.findUnique({
    where: { id: planId },
    select: { id: true, creatorId: true, visibility: true },
  });

  if (!plan || plan.visibility !== "PUBLIC") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (plan.creatorId === session.user.id) {
    return NextResponse.json({ error: "You cannot rate your own plan" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = rateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { rating } = parsed.data;

  // Upsert rating and update denormalized columns atomically
  const existing = await db.planRating.findUnique({
    where: { planId_userId: { planId, userId: session.user.id } },
  });

  await db.$transaction(async (tx) => {
    if (existing) {
      const diff = rating - existing.rating;
      await tx.planRating.update({
        where: { planId_userId: { planId, userId: session.user.id } },
        data: { rating },
      });
      await tx.trainingPlan.update({
        where: { id: planId },
        data: { starRatingSum: { increment: diff } },
      });
    } else {
      await tx.planRating.create({
        data: { planId, userId: session.user.id, rating },
      });
      await tx.trainingPlan.update({
        where: { id: planId },
        data: {
          starRatingSum: { increment: rating },
          starRatingCount: { increment: 1 },
        },
      });
    }
  });

  return NextResponse.json({ success: true, rating });
}
