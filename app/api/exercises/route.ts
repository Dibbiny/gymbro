import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const createExerciseSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  demoUrl: z.string().url().max(500).optional(),
  category: z.enum(["UPPER_BODY", "LOWER_BODY", "PULL", "PUSH", "LEGS"]),
  autoApprove: z.boolean().optional(),
});

// GET /api/exercises — list exercises visible to current user
export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  const exercises = await db.exercise.findMany({
    where: {
      AND: [
        category ? { category: category as never } : {},
        {
          OR: [
            { status: "APPROVED" },
            { status: "PENDING", submittedById: session.user.id },
          ],
        },
      ],
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      category: true,
      description: true,
      demoUrl: true,
      status: true,
      submittedById: true,
    },
  });

  return NextResponse.json({ exercises });
}

// POST /api/exercises — submit a new exercise
export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createExerciseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { autoApprove, ...data } = parsed.data;

  // Only admins can auto-approve
  const isAdmin = session.user.role === "ADMIN";
  const status = autoApprove && isAdmin ? "APPROVED" : "PENDING";

  const exercise = await db.exercise.create({
    data: {
      ...data,
      submittedById: session.user.id,
      approvedById: status === "APPROVED" ? session.user.id : null,
      status,
    },
  });

  return NextResponse.json({ exercise }, { status: 201 });
}
