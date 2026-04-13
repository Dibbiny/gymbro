import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { passwordResetToken: parsed.data.token },
    select: { id: true, passwordResetExpiry: true },
  });

  if (!user || !user.passwordResetExpiry || user.passwordResetExpiry < new Date()) {
    return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiry: null,
    },
  });

  return NextResponse.json({ ok: true });
}
