import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { generateRandomDay } from "@/lib/random-day";

const generateSchema = z.object({
  muscleGroups: z.array(z.enum(["CHEST", "BACK", "SHOULDERS", "ARMS", "LEGS", "CORE"])).optional(),
  totalSets: z.number().int().min(3).max(60),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { muscleGroups = [], totalSets } = parsed.data;

  const exercises = await db.exercise.findMany({
    where: {
      OR: [
        { status: "APPROVED" },
        { status: "PENDING", submittedById: session.user.id },
      ],
      ...(muscleGroups.length > 0 ? { muscleGroups: { hasSome: muscleGroups } } : {}),
    },
    select: { id: true, name: true, movementTypes: true, muscleGroups: true },
  });

  const generated = generateRandomDay(exercises, totalSets);

  if (generated.length === 0) {
    return NextResponse.json(
      { error: "No exercises found for these muscle groups. Try selecting different ones." },
      { status: 422 }
    );
  }

  return NextResponse.json({ exercises: generated });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = z.object({
    exercises: z.array(
      z.object({
        exerciseId: z.string(),
        sets: z.number().int().min(1),
        reps: z.number().int().min(1),
        restSeconds: z.number().int().min(0),
        orderIndex: z.number().int().min(0),
      })
    ),
  }).safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.data }, { status: 400 });
  }

  const trainingSession = await db.trainingSession.create({
    data: { userId: session.user.id },
  });

  await db.trainingSession.update({
    where: { id: trainingSession.id },
    data: {
      notes: JSON.stringify({
        randomDay: true,
        exercises: parsed.data.exercises,
      }),
    },
  });

  return NextResponse.json({ sessionId: trainingSession.id }, { status: 201 });
}
