import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({ name: z.string().min(1).max(50) });

export async function POST(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const existing = await db.category.findUnique({ where: { name: parsed.data.name } });
  if (existing) return NextResponse.json({ error: "Category already exists" }, { status: 409 });
  const category = await db.category.create({ data: { name: parsed.data.name } });
  return NextResponse.json({ category }, { status: 201 });
}
