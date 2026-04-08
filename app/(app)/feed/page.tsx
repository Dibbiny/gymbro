import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PostCard } from "@/components/feed/PostCard";
import { Dumbbell, Megaphone } from "lucide-react";
import Link from "next/link";

export default async function FeedPage() {
  const session = await auth();

  const [following, announcements] = await Promise.all([
    db.follow.findMany({
      where: { followerId: session!.user.id, status: "ACCEPTED" },
      select: { followingId: true },
    }),
    db.announcement.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);

  const followingIds = following.map((f: { followingId: string }) => f.followingId);

  const posts = await db.post.findMany({
    where: {
      OR: [
        { authorId: { in: [session!.user.id, ...followingIds] } },
        { postType: "ANNOUNCEMENT" },
      ],
    },
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
    orderBy: [{ createdAt: "desc" }],
    take: 30,
  });

  return (
    <div className="space-y-4">
      {/* Announcements */}
      {announcements.map((a: any) => (
        <div key={a.id} className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 space-y-1">
          <div className="flex items-center gap-1.5 text-primary">
            <Megaphone className="h-4 w-4 shrink-0" />
            <p className="text-sm font-semibold">{a.title}</p>
          </div>
          <p className="text-sm text-muted-foreground">{a.body}</p>
        </div>
      ))}

      {posts.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center space-y-2">
          <Dumbbell className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="font-medium">Nothing here yet</p>
          <p className="text-sm text-muted-foreground">
            Complete a workout or{" "}
            <Link href="/plans" className="text-primary hover:underline">
              find a plan
            </Link>{" "}
            to get started
          </p>
        </div>
      ) : (
        posts.map((post: any) => (
          <PostCard
            key={post.id}
            post={{
              ...post,
              createdAt: post.createdAt.toISOString(),
              sessionId: post.sessionId,
              session: post.session
                ? { ...post.session, setLogs: post.session.setLogs }
                : null,
            }}
            currentUserId={session!.user.id}
          />
        ))
      )}
    </div>
  );
}
