import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/users/[username]
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { username } = await params;

  const user = await db.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      avatarUrl: true,
      bio: true,
      experiencePoints: true,
      createdAt: true,
      _count: {
        select: {
          followers: { where: { status: "ACCEPTED" } },
          following: { where: { status: "ACCEPTED" } },
          trainingPlans: true,
        },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isSelf = user.id === session.user.id;

  // Determine follow status
  let followStatus: string | null = null;
  if (!isSelf) {
    const follow = await db.follow.findUnique({
      where: { followerId_followingId: { followerId: session.user.id, followingId: user.id } },
      select: { status: true },
    });
    followStatus = follow?.status ?? null;
  }

  const isFollowing = followStatus === "ACCEPTED";

  // Active enrollments visible to self + accepted followers
  let activeEnrollments: object[] = [];
  if (isSelf || isFollowing) {
    activeEnrollments = await db.planEnrollment.findMany({
      where: { userId: user.id, isActive: true },
      include: {
        plan: { select: { id: true, title: true, durationWeeks: true } },
      },
      orderBy: { enrolledAt: "desc" },
    });
  }

  return NextResponse.json({ user, followStatus, isSelf, activeEnrollments });
}
