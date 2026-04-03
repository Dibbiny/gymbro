import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/posts/[postId]/like — toggle like
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postId } = await params;

  const existing = await db.postLike.findUnique({
    where: { postId_userId: { postId, userId: session.user.id } },
  });

  if (existing) {
    await db.$transaction([
      db.postLike.delete({ where: { postId_userId: { postId, userId: session.user.id } } }),
      db.post.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } }),
    ]);
    return NextResponse.json({ liked: false });
  }

  await db.$transaction([
    db.postLike.create({ data: { postId, userId: session.user.id } }),
    db.post.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } }),
  ]);

  return NextResponse.json({ liked: true });
}
