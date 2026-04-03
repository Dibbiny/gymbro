import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const followSchema = z.object({ targetUserId: z.string() });
const respondSchema = z.object({
  followerId: z.string(),
  action: z.enum(["accept", "reject"]),
});

// POST /api/follows — send follow request
export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = followSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { targetUserId } = parsed.data;

  if (targetUserId === session.user.id) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  const target = await db.user.findUnique({ where: { id: targetUserId }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const existing = await db.follow.findUnique({
    where: { followerId_followingId: { followerId: session.user.id, followingId: targetUserId } },
  });

  if (existing) {
    if (existing.status === "ACCEPTED") {
      return NextResponse.json({ error: "Already following" }, { status: 409 });
    }
    return NextResponse.json({ follow: existing });
  }

  const follow = await db.follow.create({
    data: { followerId: session.user.id, followingId: targetUserId },
  });

  return NextResponse.json({ follow }, { status: 201 });
}

// PATCH /api/follows — accept or reject a follow request
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = respondSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { followerId, action } = parsed.data;

  const follow = await db.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId: session.user.id } },
  });

  if (!follow || follow.status !== "PENDING") {
    return NextResponse.json({ error: "No pending request found" }, { status: 404 });
  }

  const updated = await db.follow.update({
    where: { followerId_followingId: { followerId, followingId: session.user.id } },
    data: { status: action === "accept" ? "ACCEPTED" : "REJECTED" },
  });

  return NextResponse.json({ follow: updated });
}

// DELETE /api/follows — unfollow
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const targetUserId = searchParams.get("targetUserId");

  if (!targetUserId) return NextResponse.json({ error: "targetUserId required" }, { status: 400 });

  await db.follow.deleteMany({
    where: { followerId: session.user.id, followingId: targetUserId },
  });

  return NextResponse.json({ success: true });
}
