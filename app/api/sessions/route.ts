import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const freeExerciseSchema = z.object({
  exerciseId: z.string(),
  exerciseName: z.string(),
  sets: z.number().int().min(1).max(20),
  reps: z.number().int().min(1).max(100),
  restSeconds: z.number().int().min(0).max(600),
  orderIndex: z.number().int().min(0),
});

const startSchema = z.object({
  enrollmentId: z.string().optional(),
  planDayId: z.string().optional(),
  freeExercises: z.array(freeExerciseSchema).min(1).optional(),
});

// POST /api/sessions — start a new training session
export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = startSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  // If there's already an incomplete session for this plan day, resume it
  if (parsed.data.planDayId) {
    const existing = await db.trainingSession.findFirst({
      where: {
        userId: session.user.id,
        planDayId: parsed.data.planDayId,
        completedAt: null,
      },
    });
    if (existing) {
      return NextResponse.json({ session: existing });
    }
  }

  const trainingSession = await db.trainingSession.create({
    data: {
      userId: session.user.id,
      enrollmentId: parsed.data.enrollmentId ?? null,
      planDayId: parsed.data.planDayId ?? null,
      ...(parsed.data.freeExercises
        ? { notes: JSON.stringify({ freeTraining: true, exercises: parsed.data.freeExercises }) }
        : {}),
    },
  });

  return NextResponse.json({ session: trainingSession }, { status: 201 });
}
