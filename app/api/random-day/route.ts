import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { generateRandomDay, FocusType } from "@/lib/random-day";

const FOCUS_TO_CATEGORY: Record<string, string> = {
  UPPER_BODY: "Upper Body",
  LOWER_BODY: "Lower Body",
  PULL: "Pull",
  PUSH: "Push",
  LEGS: "Legs",
};

const generateSchema = z.object({
  focus: z.enum(["FULL_BODY", "UPPER_BODY", "LOWER_BODY", "PULL", "PUSH", "LEGS"]),
  totalSets: z.number().int().min(3).max(60),
});

// POST /api/random-day/generate — generate a day (no DB write yet)
export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { focus, totalSets } = parsed.data;

  const exercises = await db.exercise.findMany({
    where: {
      OR: [
        { status: "APPROVED" },
        { status: "PENDING", submittedById: session.user.id },
      ],
      ...(focus !== "FULL_BODY" ? { categories: { some: { name: FOCUS_TO_CATEGORY[focus] } } } : {}),
    },
    select: { id: true, name: true, categories: { select: { name: true } } },
  });

  const generated = generateRandomDay(exercises, focus as FocusType, totalSets);

  if (generated.length === 0) {
    return NextResponse.json(
      { error: "No exercises found for this focus. Add more exercises first." },
      { status: 422 }
    );
  }

  return NextResponse.json({ exercises: generated });
}

// POST /api/random-day/start — start an actual session from a random day
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

  // Create an ephemeral plan day + session (no enrollment)
  const trainingSession = await db.trainingSession.create({
    data: { userId: session.user.id },
  });

  // We store exercises in a virtual plan day attached to this session
  // Since random sessions have no planDay, we embed the exercise list in the response
  // The session page reads exercises from the API when planDay is null
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
