import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/users?q=username — search users by username
export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (q.length < 1) return NextResponse.json({ users: [] });

  const users = await db.user.findMany({
    where: {
      username: { contains: q, mode: "insensitive" },
      NOT: { id: session.user.id },
    },
    select: {
      id: true,
      username: true,
      avatarUrl: true,
      experiencePoints: true,
      followers: {
        where: { followerId: session.user.id },
        select: { status: true },
      },
    },
    take: 20,
    orderBy: { username: "asc" },
  });

  return NextResponse.json({ users });
}
