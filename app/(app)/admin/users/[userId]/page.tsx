import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { xpToLevel } from "@/lib/xp";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { ChevronLeft, Dumbbell, Medal, FileText, Users } from "lucide-react";

interface Props {
  params: Promise<{ userId: string }>;
}

export default async function AdminUserDetailPage({ params }: Props) {
  const { userId } = await params;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      avatarUrl: true,
      bio: true,
      role: true,
      experiencePoints: true,
      createdAt: true,
      _count: {
        select: {
          followers: { where: { status: "ACCEPTED" } },
          following: { where: { status: "ACCEPTED" } },
          posts: true,
          trainingSessions: { where: { completedAt: { not: null } } },
        },
      },
    },
  });

  if (!user) notFound();

  const { level, progress, nextLevelXp } = xpToLevel(user.experiencePoints);

  // Active enrollments
  const enrollments = await db.planEnrollment.findMany({
    where: { userId },
    include: { plan: { select: { id: true, title: true, durationWeeks: true } } },
    orderBy: { enrolledAt: "desc" },
  });

  // Recent completed sessions
  const sessions = await db.trainingSession.findMany({
    where: { userId, completedAt: { not: null } },
    include: {
      planDay: { select: { label: true, dayOfWeek: true, plan: { select: { title: true } } } },
      _count: { select: { setLogs: true } },
    },
    orderBy: { completedAt: "desc" },
    take: 10,
  });

  // Personal Records
  const prRows = await db.setLog.groupBy({
    by: ["exerciseId"],
    where: {
      session: { userId, completedAt: { not: null } },
      weightKg: { not: null },
    },
    _max: { weightKg: true },
    orderBy: { _max: { weightKg: "desc" } },
    take: 20,
  });

  let prs: { name: string; weightKg: number }[] = [];
  if (prRows.length > 0) {
    const exercises = await db.exercise.findMany({
      where: { id: { in: prRows.map((r: any) => r.exerciseId) } },
      select: { id: true, name: true },
    });
    const nameMap = new Map(exercises.map((e: any) => [e.id, e.name]));
    prs = prRows.map((r: any) => ({
      name: nameMap.get(r.exerciseId) ?? r.exerciseId,
      weightKg: r._max.weightKg!,
    }));
  }

  // Recent posts
  const posts = await db.post.findMany({
    where: { authorId: userId },
    select: {
      id: true,
      body: true,
      createdAt: true,
      _count: { select: { likes: true, comments: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  // Follow relationships
  const followers = await db.follow.findMany({
    where: { followingId: userId, status: "ACCEPTED" },
    select: { follower: { select: { id: true, username: true, avatarUrl: true } } },
  });
  const following = await db.follow.findMany({
    where: { followerId: userId, status: "ACCEPTED" },
    select: { following: { select: { id: true, username: true, avatarUrl: true } } },
  });

  const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href="/admin/users" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">User Detail</h1>
      </div>

      {/* Profile */}
      <div className="rounded-xl border p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-14 w-14">
            <AvatarImage src={user.avatarUrl ?? undefined} />
            <AvatarFallback className="text-lg font-bold">
              {user.username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-base">@{user.username}</p>
              <Badge variant={user.role === "ADMIN" ? "default" : "secondary"} className="text-[10px]">
                {user.role}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            {user.bio && <p className="text-xs text-muted-foreground mt-0.5">{user.bio}</p>}
            <p className="text-xs text-muted-foreground mt-0.5">
              Joined {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: "Workouts", value: user._count.trainingSessions },
            { label: "Posts", value: user._count.posts },
            { label: "Followers", value: user._count.followers },
            { label: "Following", value: user._count.following },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg bg-muted/40 py-2">
              <p className="text-base font-bold">{value}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* Level */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">Level {level}</span>
            <span className="text-xs text-muted-foreground">{user.experiencePoints} / {nextLevelXp} XP</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Enrollments */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold flex items-center gap-1.5">
          <Dumbbell className="h-4 w-4" /> Training Plans ({enrollments.length})
        </h2>
        {enrollments.length === 0 ? (
          <p className="text-xs text-muted-foreground">No enrollments.</p>
        ) : (
          <div className="space-y-1.5">
            {enrollments.map((e: any) => (
              <div key={e.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                <Link href={`/plans/${e.plan.id}`} className="font-medium hover:underline truncate">
                  {e.plan.title}
                </Link>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <Badge variant={e.isActive ? "default" : "secondary"} className="text-[10px]">
                    {e.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(e.enrolledAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Separator />

      {/* Recent sessions */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold flex items-center gap-1.5">
          <Dumbbell className="h-4 w-4" /> Recent Sessions
        </h2>
        {sessions.length === 0 ? (
          <p className="text-xs text-muted-foreground">No completed sessions.</p>
        ) : (
          <div className="space-y-1.5">
            {sessions.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">
                    {s.planDay ? `${DAY_NAMES[s.planDay.dayOfWeek]} — ${s.planDay.label ?? s.planDay.plan?.title}` : "Random Day"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(s.completedAt).toLocaleDateString()} · {s._count.setLogs} sets
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Separator />

      {/* Personal Records */}
      {prs.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold flex items-center gap-1.5">
            <Medal className="h-4 w-4" /> Personal Records
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {prs.map((pr) => (
              <div key={pr.name} className="rounded-xl border bg-card px-3 py-2.5 space-y-0.5">
                <p className="text-xs text-muted-foreground truncate">{pr.name}</p>
                <p className="text-base font-bold">
                  {pr.weightKg % 1 === 0 ? pr.weightKg : pr.weightKg.toFixed(1)} kg
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <Separator />

      {/* Recent posts */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold flex items-center gap-1.5">
          <FileText className="h-4 w-4" /> Recent Posts ({user._count.posts})
        </h2>
        {posts.length === 0 ? (
          <p className="text-xs text-muted-foreground">No posts.</p>
        ) : (
          <div className="space-y-1.5">
            {posts.map((p: any) => (
              <div key={p.id} className="rounded-lg border px-3 py-2 space-y-1">
                <p className="text-sm line-clamp-2">{p.body}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(p.createdAt).toLocaleDateString()} · {p._count.likes} likes · {p._count.comments} comments
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <Separator />

      {/* Social graph */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-1.5">
          <Users className="h-4 w-4" /> Social
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Followers ({followers.length})</p>
            {followers.slice(0, 8).map((f: any) => (
              <Link
                key={f.follower.id}
                href={`/admin/users/${f.follower.id}`}
                className="flex items-center gap-2 text-sm hover:underline"
              >
                <Avatar className="h-5 w-5">
                  <AvatarImage src={f.follower.avatarUrl ?? undefined} />
                  <AvatarFallback className="text-[8px]">{f.follower.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                @{f.follower.username}
              </Link>
            ))}
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Following ({following.length})</p>
            {following.slice(0, 8).map((f: any) => (
              <Link
                key={f.following.id}
                href={`/admin/users/${f.following.id}`}
                className="flex items-center gap-2 text-sm hover:underline"
              >
                <Avatar className="h-5 w-5">
                  <AvatarImage src={f.following.avatarUrl ?? undefined} />
                  <AvatarFallback className="text-[8px]">{f.following.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                @{f.following.username}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
