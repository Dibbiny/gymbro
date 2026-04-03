import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const approvalSchema = z.object({
  action: z.enum(["approve", "reject"]),
});

const editSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  demoUrl: z.string().url().max(500).optional().or(z.literal("")),
  category: z.enum(["UPPER_BODY", "LOWER_BODY", "PULL", "PUSH", "LEGS"]),
});

// PATCH — approve / reject
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ exerciseId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { exerciseId } = await params;
  const body = await request.json();
  const parsed = approvalSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const status = parsed.data.action === "approve" ? "APPROVED" : "REJECTED";

  const exercise = await db.exercise.update({
    where: { id: exerciseId },
    data: {
      status,
      approvedById: parsed.data.action === "approve" ? session.user.id : null,
    },
  });

  return NextResponse.json({ exercise });
}

// PUT — edit exercise fields
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ exerciseId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { exerciseId } = await params;
  const body = await request.json();
  const parsed = editSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const exercise = await db.exercise.update({
    where: { id: exerciseId },
    data: {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      demoUrl: parsed.data.demoUrl || null,
      category: parsed.data.category,
    },
  });

  return NextResponse.json({ exercise });
}

// DELETE — remove exercise (only if not in use)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ exerciseId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { exerciseId } = await params;

  const [planCount, logCount] = await Promise.all([
    db.planDayExercise.count({ where: { exerciseId } }),
    db.setLog.count({ where: { exerciseId } }),
  ]);

  if (planCount > 0 || logCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete: used in ${planCount} plan(s) and ${logCount} set log(s)` },
      { status: 409 }
    );
  }

  await db.exercise.delete({ where: { id: exerciseId } });
  return NextResponse.json({ success: true });
}
