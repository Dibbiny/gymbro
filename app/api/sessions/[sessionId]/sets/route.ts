import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const logSetSchema = z.object({
  exerciseId: z.string(),
  setNumber: z.number().int().min(1),
  weightKg: z.number().min(0).optional(),
  repsCompleted: z.number().int().min(0),
});

// POST /api/sessions/[sessionId]/sets — log a completed set
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await params;

  const trainingSession = await db.trainingSession.findUnique({
    where: { id: sessionId },
    select: { userId: true, completedAt: true },
  });

  if (!trainingSession) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (trainingSession.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (trainingSession.completedAt) {
    return NextResponse.json({ error: "Session already completed" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = logSetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  // Upsert — allow re-logging the same set number
  const existing = await db.setLog.findFirst({
    where: { sessionId, exerciseId: parsed.data.exerciseId, setNumber: parsed.data.setNumber },
  });

  const setLog = existing
    ? await db.setLog.update({
        where: { id: existing.id },
        data: { weightKg: parsed.data.weightKg ?? null, repsCompleted: parsed.data.repsCompleted },
      })
    : await db.setLog.create({
        data: { sessionId, ...parsed.data, weightKg: parsed.data.weightKg ?? null },
      });

  return NextResponse.json({ setLog }, { status: 201 });
}

// GET /api/sessions/[sessionId]/sets — get last known values for exercises
export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await params;
  const { searchParams } = new URL(request.url);
  const exerciseId = searchParams.get("exerciseId");

  if (!exerciseId) {
    return NextResponse.json({ error: "exerciseId required" }, { status: 400 });
  }

  // Find the most recent set log for this exercise by this user (across all sessions)
  const lastLog = await db.setLog.findFirst({
    where: {
      exerciseId,
      session: { userId: session.user.id, completedAt: { not: null } },
    },
    orderBy: { loggedAt: "desc" },
    select: { weightKg: true, repsCompleted: true },
  });

  return NextResponse.json({ lastLog });
}
