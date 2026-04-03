import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LikeButton } from "./LikeButton";
import { CommentSection } from "./CommentSection";
import { formatDistanceToNow } from "@/lib/time";
import { Dumbbell, Trophy } from "lucide-react";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Post {
  id: string;
  postType: string;
  body: string | null;
  likeCount: number;
  createdAt: string;
  author: { id: string; username: string; avatarUrl: string | null };
  session: {
    planDay: { label: string | null; dayOfWeek: number } | null;
    setLogs: { id: string }[];
  } | null;
  enrollment: { plan: { title: string } } | null;
  likes: { id: string }[];
  _count: { likes: number; comments: number };
}

export function PostCard({ post, currentUserId }: { post: Post; currentUserId: string }) {
  const isLiked = post.likes.length > 0;
  const setsCompleted = post.session?.setLogs.length ?? 0;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      {/* Author + meta */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Link href={`/profile/${post.author.username}`}>
            <Avatar className="h-9 w-9">
              <AvatarImage src={post.author.avatarUrl ?? undefined} />
              <AvatarFallback className="text-xs font-semibold">
                {post.author.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div>
            <Link
              href={`/profile/${post.author.username}`}
              className="text-sm font-semibold hover:underline"
            >
              @{post.author.username}
            </Link>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(post.createdAt))}
            </p>
          </div>
        </div>

        <Badge
          variant={post.postType === "PLAN_COMPLETION" ? "default" : "secondary"}
          className="shrink-0 gap-1 text-xs"
        >
          {post.postType === "PLAN_COMPLETION" ? (
            <><Trophy className="h-3 w-3" /> Finished plan</>
          ) : (
            <><Dumbbell className="h-3 w-3" /> Workout done</>
          )}
        </Badge>
      </div>

      {/* Session summary */}
      {post.session && (
        <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm space-y-0.5">
          {post.session.planDay && (
            <p className="font-medium">
              {post.session.planDay.label ?? DAY_NAMES[post.session.planDay.dayOfWeek]}
            </p>
          )}
          {post.enrollment && (
            <p className="text-xs text-muted-foreground">{post.enrollment.plan.title}</p>
          )}
          <p className="text-xs text-muted-foreground">{setsCompleted} sets completed</p>
        </div>
      )}

      {post.postType === "PLAN_COMPLETION" && post.enrollment && (
        <div className="rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 text-sm">
          <p className="font-semibold text-primary">Completed: {post.enrollment.plan.title}</p>
        </div>
      )}

      {/* Post body */}
      {post.body && <p className="text-sm">{post.body}</p>}

      {/* Actions */}
      <div className="flex items-center gap-4 pt-1">
        <LikeButton
          postId={post.id}
          initialLiked={isLiked}
          initialCount={post._count.likes}
        />
        <CommentSection
          postId={post.id}
          initialComments={[]}
          commentCount={post._count.comments}
        />
      </div>
    </div>
  );
}
