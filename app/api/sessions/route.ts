import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const startSchema = z.object({
  enrollmentId: z.string().optional(),
  planDayId: z.string().optional(),
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

  const trainingSession = await db.trainingSession.create({
    data: {
      userId: session.user.id,
      enrollmentId: parsed.data.enrollmentId ?? null,
      planDayId: parsed.data.planDayId ?? null,
    },
    include: {
      planDay: {
        include: {
          planDayExercises: {
            orderBy: { orderIndex: "asc" },
            include: { exercise: true },
          },
        },
      },
    },
  });

  return NextResponse.json({ session: trainingSession }, { status: 201 });
}
