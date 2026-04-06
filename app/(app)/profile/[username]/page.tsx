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
import { Dumbbell, Trophy, User, Pencil, History, Medal } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface Props {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ list?: string }>;
}

export default async function ProfilePage({ params, searchParams }: Props) {
  const session = await auth();
  const { username: rawUsername } = await params;
  const username = rawUsername.toLowerCase();
  const { list } = await searchParams;

  const user = await db.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
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
          trainingSessions: { where: { completedAt: { not: null } } },
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

  // Followers / following list view
  if (list === "followers" || list === "following") {
    const rows = list === "followers"
      ? await db.follow.findMany({
          where: { followingId: user.id, status: "ACCEPTED" },
          select: {
            follower: {
              select: {
                id: true, username: true, avatarUrl: true, experiencePoints: true,
                followers: { where: { followerId: session!.user.id }, select: { status: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }).then((r: any[]) => r.map((x: any) => x.follower))
      : await db.follow.findMany({
          where: { followerId: user.id, status: "ACCEPTED" },
          select: {
            following: {
              select: {
                id: true, username: true, avatarUrl: true, experiencePoints: true,
                followers: { where: { followerId: session!.user.id }, select: { status: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }).then((r: any[]) => r.map((x: any) => x.following));

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Link href={`/profile/${username}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            @{username}
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-sm font-semibold capitalize">{list}</h1>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center space-y-2">
            <User className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No {list} yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((u: any) => {
              const { level } = xpToLevel(u.experiencePoints);
              const fs = u.followers[0]?.status ?? null;
              return (
                <div key={u.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <Link href={`/profile/${u.username}`} className="flex-1 flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                      {u.avatarUrl ? (
                        <Image src={u.avatarUrl} alt={u.username} width={40} height={40} className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">@{u.username}</p>
                      <p className="text-xs text-muted-foreground">Level {level}</p>
                    </div>
                  </Link>
                  {u.id !== session!.user.id && (
                    <FollowButton targetUserId={u.id} initialStatus={fs} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Active enrollments (only visible to self + accepted followers)
  const activeEnrollments = canSeeFull
    ? await db.planEnrollment.findMany({
        where: { userId: user.id, isActive: true },
        include: { plan: { select: { id: true, title: true, durationWeeks: true } } },
        orderBy: { enrolledAt: "desc" },
      })
    : [];

  // Personal Records (max weight per exercise, only for self + followers)
  let prs: { name: string; weightKg: number }[] = [];
  if (canSeeFull) {
    const prRows = await db.setLog.groupBy({
      by: ["exerciseId"],
      where: {
        session: { userId: user.id, completedAt: { not: null } },
        weightKg: { not: null },
      },
      _max: { weightKg: true },
      orderBy: { _max: { weightKg: "desc" } },
      take: 15,
    });
    if (prRows.length > 0) {
      const exerciseNames = await db.exercise.findMany({
        where: { id: { in: prRows.map((r: any) => r.exerciseId) } },
        select: { id: true, name: true },
      });
      const nameMap = new Map(exerciseNames.map((e: any) => [e.id, e.name]));
      prs = prRows.map((r: any) => ({
        name: nameMap.get(r.exerciseId) ?? r.exerciseId,
        weightKg: r._max.weightKg!,
      }));
    }
  }

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
          {isSelf ? (
            <Link
              href="/profile/edit"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-8 text-sm font-medium hover:bg-muted transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Link>
          ) : (
            <FollowButton targetUserId={user.id} initialStatus={followStatus} />
          )}
        </div>

        {/* Stats row */}
        <div className="flex gap-4 text-center">
          <Link href={`/profile/${username}?list=followers`} className="hover:opacity-70 transition-opacity">
            <p className="text-lg font-bold">{user._count.followers}</p>
            <p className="text-xs text-muted-foreground">Followers</p>
          </Link>
          <Link href={`/profile/${username}?list=following`} className="hover:opacity-70 transition-opacity">
            <p className="text-lg font-bold">{user._count.following}</p>
            <p className="text-xs text-muted-foreground">Following</p>
          </Link>
          <div>
            <p className="text-lg font-bold">{user._count.trainingSessions}</p>
            <p className="text-xs text-muted-foreground">Workouts</p>
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

        {/* History shortcut — only for self */}
        {isSelf && (
          <Link
            href="/history"
            className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-2.5 hover:bg-muted transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <History className="h-4 w-4 text-muted-foreground" />
              My Training History
            </span>
            <span className="text-xs text-muted-foreground">→</span>
          </Link>
        )}
      </div>

      {/* Currently training (self + followers only) */}
      {activeEnrollments.length > 0 && (
        <>
          <Separator />
          <section className="space-y-2">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <Dumbbell className="h-4 w-4" /> Currently training
            </h2>
            {activeEnrollments.map((e: any) => (
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

      {/* Personal Records */}
      {prs.length > 0 && (
        <>
          <Separator />
          <section className="space-y-2">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <Medal className="h-4 w-4" /> Personal Records
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {prs.map((pr: any) => (
                <div key={pr.name} className="rounded-xl border bg-card px-3 py-2.5 space-y-0.5">
                  <p className="text-xs text-muted-foreground truncate">{pr.name}</p>
                  <p className="text-base font-bold">{pr.weightKg % 1 === 0 ? pr.weightKg : pr.weightKg.toFixed(1)} kg</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* Posts */}
      {posts.length > 0 && (
        <>
          <Separator />
          <section className="space-y-3">
            <h2 className="text-sm font-semibold">Posts</h2>
            {posts.map((post: any) => (
              <PostCard
                key={post.id}
                post={{ ...post, createdAt: post.createdAt.toISOString(), sessionId: post.sessionId }}
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
