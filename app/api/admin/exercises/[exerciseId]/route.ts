import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["approve", "reject"]),
});

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
  const parsed = schema.safeParse(body);
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
