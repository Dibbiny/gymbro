import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PostCard } from "@/components/feed/PostCard";
import { FollowButton } from "@/components/social/FollowButton";
import { xpToLevel } from "@/lib/xp";
import { Progress } from "@/components/ui/progress";
import { Dumbbell, Trophy } from "lucide-react";
import Link from "next/link";

interface Props {
  params: Promise<{ username: string }>;
}

export default async function ProfilePage({ params }: Props) {
  const session = await auth();
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
        },
      },
    },
  });

  if (!user) notFound();

  const isSelf = user.id === session!.user.id;

  let followStatus: string | null = null;
  if (!isSelf) {
    const follow = await db.follow.findUnique({
      where: { followerId_followingId: { followerId: session!.user.id, followingId: user.id } },
      select: { status: true },
    });
    followStatus = follow?.status ?? null;
  }

  const isFollowing = followStatus === "ACCEPTED";
  const canSeeFull = isSelf || isFollowing;

  // Active enrollments (only visible to self + accepted followers)
  const activeEnrollments = canSeeFull
    ? await db.planEnrollment.findMany({
        where: { userId: user.id, isActive: true },
        include: { plan: { select: { id: true, title: true, durationWeeks: true } } },
        orderBy: { enrolledAt: "desc" },
      })
    : [];

  // Posts
  const posts = await db.post.findMany({
    where: { authorId: user.id },
    include: {
      author: { select: { id: true, username: true, avatarUrl: true } },
      session: {
        include: {
          planDay: { select: { label: true, dayOfWeek: true } },
          setLogs: { select: { id: true } },
        },
      },
      enrollment: { include: { plan: { select: { title: true } } } },
      likes: { where: { userId: session!.user.id }, select: { id: true } },
      _count: { select: { likes: true, comments: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const { level, progress, nextLevelXp } = xpToLevel(user.experiencePoints);

  return (
    <div className="space-y-5">
      {/* Profile header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.avatarUrl ?? undefined} />
              <AvatarFallback className="text-xl font-bold">
                {user.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-bold">@{user.username}</h1>
              {user.bio && <p className="text-sm text-muted-foreground mt-0.5">{user.bio}</p>}
            </div>
          </div>
          {!isSelf && (
            <FollowButton targetUserId={user.id} initialStatus={followStatus} />
          )}
        </div>

        {/* Stats row */}
        <div className="flex gap-4 text-center">
          <div>
            <p className="text-lg font-bold">{user._count.followers}</p>
            <p className="text-xs text-muted-foreground">Followers</p>
          </div>
          <div>
            <p className="text-lg font-bold">{user._count.following}</p>
            <p className="text-xs text-muted-foreground">Following</p>
          </div>
          <div>
            <p className="text-lg font-bold">{user.experiencePoints}</p>
            <p className="text-xs text-muted-foreground">XP</p>
          </div>
        </div>

        {/* Level */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">Level {level}</span>
            <span className="text-xs text-muted-foreground">{user.experiencePoints} / {nextLevelXp} XP</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Currently training (self + followers only) */}
      {activeEnrollments.length > 0 && (
        <>
          <Separator />
          <section className="space-y-2">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <Dumbbell className="h-4 w-4" /> Currently training
            </h2>
            {activeEnrollments.map((e) => (
              <Link
                key={e.id}
                href={`/plans/${e.plan.id}`}
                className="flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-muted transition-colors"
              >
                <span className="text-sm font-medium">{e.plan.title}</span>
                <Badge variant="secondary" className="text-xs">{e.plan.durationWeeks}w</Badge>
              </Link>
            ))}
          </section>
        </>
      )}

      {/* Posts */}
      {posts.length > 0 && (
        <>
          <Separator />
          <section className="space-y-3">
            <h2 className="text-sm font-semibold">Posts</h2>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={{ ...post, createdAt: post.createdAt.toISOString() }}
                currentUserId={session!.user.id}
              />
            ))}
          </section>
        </>
      )}

      {posts.length === 0 && !canSeeFull && (
        <div className="rounded-xl border border-dashed p-8 text-center space-y-1">
          <Trophy className="h-7 w-7 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Follow to see their training</p>
        </div>
      )}
    </div>
  );
}
