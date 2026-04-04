import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const createExerciseSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  demoUrl: z.string().url().max(500).optional(),
  categoryIds: z.array(z.string().min(1)).min(1, "Select at least one category"),
  autoApprove: z.boolean().optional(),
});

// GET /api/exercises — list exercises visible to current user
export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const exercises = await db.exercise.findMany({
    where: {
      OR: [
        { status: "APPROVED" },
        { status: "PENDING", submittedById: session.user.id },
      ],
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      categories: { select: { id: true, name: true } },
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

  const { autoApprove, categoryIds, ...data } = parsed.data;

  // Only admins can auto-approve
  const isAdmin = session.user.role === "ADMIN";
  const status = autoApprove && isAdmin ? "APPROVED" : "PENDING";

  const exercise = await db.exercise.create({
    data: {
      name: data.name,
      description: data.description ?? null,
      demoUrl: data.demoUrl || null,
      submittedById: session.user.id,
      approvedById: status === "APPROVED" ? session.user.id : null,
      status,
      categories: { connect: categoryIds.map((id) => ({ id })) },
    },
  });

  return NextResponse.json({ exercise }, { status: 201 });
}
