"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LikeButton } from "./LikeButton";
import { CommentSection } from "./CommentSection";
import { formatDistanceToNow } from "@/lib/time";
import { Dumbbell, Trophy, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Post {
  id: string;
  postType: string;
  body: string | null;
  imageUrl?: string | null;
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
  const router = useRouter();
  const isLiked = post.likes.length > 0;
  const setsCompleted = post.session?.setLogs.length ?? 0;
  const isOwner = post.author.id === currentUserId;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Failed to delete post"); return; }
      toast.success("Post deleted");
      setDeleteOpen(false);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

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
            <Link href={`/profile/${post.author.username}`} className="text-sm font-semibold hover:underline">
              @{post.author.username}
            </Link>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(post.createdAt))}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge
            variant={post.postType === "PLAN_COMPLETION" ? "default" : "secondary"}
            className="gap-1 text-xs"
          >
            {post.postType === "PLAN_COMPLETION" ? (
              <><Trophy className="h-3 w-3" /> Finished plan</>
            ) : (
              <><Dumbbell className="h-3 w-3" /> Workout done</>
            )}
          </Badge>
          {isOwner && (
            <button
              onClick={() => setDeleteOpen(true)}
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
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

      {/* Post image */}
      {post.imageUrl && (
        <div className="rounded-xl overflow-hidden">
          <img src={post.imageUrl} alt="Post image" className="w-full object-cover max-h-72" />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 pt-1">
        <LikeButton postId={post.id} initialLiked={isLiked} initialCount={post._count.likes} />
        <CommentSection postId={post.id} initialComments={[]} commentCount={post._count.comments} />
      </div>

      {/* Delete dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Delete this post?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This cannot be undone.</p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" className="flex-1" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
