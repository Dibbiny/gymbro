import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const createPostSchema = z.object({
  body: z.string().max(1000).optional(),
  sessionId: z.string().optional(),
  enrollmentId: z.string().optional(),
  postType: z.enum(["TRAINING_DAY", "PLAN_COMPLETION"]),
});

// GET /api/posts — paginated feed
export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor"); // "createdAt_id"
  const limit = 20;

  // Get IDs of accepted followers
  const following = await db.follow.findMany({
    where: { followerId: session.user.id, status: "ACCEPTED" },
    select: { followingId: true },
  });
  const followingIds = following.map((f: { followingId: string }) => f.followingId);

  const posts = await db.post.findMany({
    where: {
      authorId: { in: [session.user.id, ...followingIds] },
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: new Date(cursor.split("_")[0]) } },
              {
                createdAt: new Date(cursor.split("_")[0]),
                id: { lt: cursor.split("_")[1] },
              },
            ],
          }
        : {}),
    },
    include: {
      author: { select: { id: true, username: true, avatarUrl: true } },
      session: {
        include: {
          planDay: { select: { label: true, dayOfWeek: true } },
          setLogs: { select: { id: true } },
        },
      },
      enrollment: {
        include: { plan: { select: { title: true } } },
      },
      likes: { where: { userId: session.user.id }, select: { id: true } },
      _count: { select: { likes: true, comments: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
  });

  const nextCursor =
    posts.length === limit
      ? `${posts[posts.length - 1].createdAt.toISOString()}_${posts[posts.length - 1].id}`
      : null;

  return NextResponse.json({ posts, nextCursor });
}

// POST /api/posts — create a post
export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const post = await db.post.create({
    data: {
      authorId: session.user.id,
      body: parsed.data.body ?? null,
      sessionId: parsed.data.sessionId ?? null,
      enrollmentId: parsed.data.enrollmentId ?? null,
      postType: parsed.data.postType,
    },
    include: {
      author: { select: { id: true, username: true, avatarUrl: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  return NextResponse.json({ post }, { status: 201 });
}
