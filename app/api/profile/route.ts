import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  bio: z.string().max(200).optional(),
  avatarUrl: z.string().url().max(500).optional().or(z.literal("")),
});

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const user = await db.user.update({
    where: { id: session.user.id },
    data: {
      bio: parsed.data.bio ?? null,
      avatarUrl: parsed.data.avatarUrl || null,
    },
    select: { id: true, username: true, bio: true, avatarUrl: true },
  });

  return NextResponse.json({ user });
}
