import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const createExerciseSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  demoUrl: z.string().url().max(500).optional(),
  categoryIds: z.array(z.string().min(1)).optional(),
  quickAdd: z.boolean().optional(),
  autoApprove: z.boolean().optional(),
});

// GET /api/exercises — list exercises visible to current user, optionally filtered by ?q=
export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  const exercises = await db.exercise.findMany({
    where: {
      OR: [
        { status: "APPROVED" },
        { status: "PENDING", submittedById: session.user.id },
      ],
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
    take: q ? 20 : undefined,
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

  const { autoApprove, quickAdd, categoryIds, ...data } = parsed.data;

  if (!quickAdd && (!categoryIds || categoryIds.length === 0)) {
    return NextResponse.json({ error: "Select at least one category" }, { status: 400 });
  }

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
      ...(categoryIds?.length ? { categories: { connect: categoryIds.map((id) => ({ id })) } } : {}),
    },
  });

  return NextResponse.json({ exercise }, { status: 201 });
}
