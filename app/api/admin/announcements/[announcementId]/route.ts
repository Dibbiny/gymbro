import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({ isActive: z.boolean() });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ announcementId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { announcementId } = await params;
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const announcement = await db.announcement.update({
    where: { id: announcementId },
    data: { isActive: parsed.data.isActive },
  });

  return NextResponse.json({ announcement });
}
