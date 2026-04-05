import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const createPlanSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().max(500).optional(),
  durationWeeks: z.number().int().min(1).max(52),
  visibility: z.enum(["PUBLIC", "PRIVATE"]),
  days: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      weekNumber: z.number().int().min(1),
      label: z.string().max(50).optional(),
      exercises: z.array(
        z.object({
          exerciseId: z.string(),
          orderIndex: z.number().int().min(0),
          sets: z.number().int().min(1).max(100),
          reps: z.number().int().min(1).max(1000),
          restSeconds: z.number().int().min(0).max(600),
        })
      ),
    })
  ),
});

// GET /api/plans — browse public plans
export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const sort = searchParams.get("sort") ?? "rating";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 20;

  const orderBy =
    sort === "newest"
      ? { createdAt: "desc" as const }
      : sort === "duration"
      ? { durationWeeks: "asc" as const }
      : undefined;

  const plans = await db.trainingPlan.findMany({
    where: { visibility: "PUBLIC" },
    include: {
      creator: { select: { username: true, avatarUrl: true } },
      _count: { select: { planEnrollments: true } },
    },
    orderBy: orderBy ?? { starRatingSum: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  return NextResponse.json({ plans });
}

// POST /api/plans — create a plan
export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createPlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { title, description, durationWeeks, visibility, days } = parsed.data;

  const plan = await db.trainingPlan.create({
    data: {
      title,
      description,
      durationWeeks,
      visibility,
      creatorId: session.user.id,
      planDays: {
        create: days.map((day: any) => ({
          dayOfWeek: day.dayOfWeek,
          weekNumber: day.weekNumber,
          label: day.label,
          planDayExercises: {
            create: day.exercises.map((ex: any) => ({
              exerciseId: ex.exerciseId,
              orderIndex: ex.orderIndex,
              sets: ex.sets,
              reps: ex.reps,
              restSeconds: ex.restSeconds,
            })),
          },
        })),
      },
    },
    include: { planDays: { include: { planDayExercises: true } } },
  });

  return NextResponse.json({ plan }, { status: 201 });
}
