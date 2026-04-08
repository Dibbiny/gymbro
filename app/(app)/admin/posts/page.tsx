import { db } from "@/lib/db";
import Link from "next/link";
import Image from "next/image";
import { Plus, Pencil } from "lucide-react";
import { formatDistanceToNow } from "@/lib/time";
import { AdminPostDeleteButton } from "@/components/admin/AdminPostDeleteButton";

export default async function AdminPostsPage() {
  const posts = await db.post.findMany({
    where: { postType: "ANNOUNCEMENT" },
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { username: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{posts.length} admin post{posts.length !== 1 ? "s" : ""}</p>
        <Link
          href="/admin/posts/new"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-8 text-sm font-medium hover:bg-muted transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> New Post
        </Link>
      </div>

      <div className="space-y-2">
        {posts.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-10">No admin posts yet.</p>
        )}
        {posts.map((post: any) => (
          <div key={post.id} className="rounded-xl border p-3.5 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {post.body && (
                  <p className="text-sm line-clamp-2">{post.body}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  @{post.author.username} · {formatDistanceToNow(new Date(post.createdAt))} · {post._count.likes} likes · {post._count.comments} comments
                </p>
              </div>
              {post.imageUrl && (
                <div className="rounded-lg overflow-hidden shrink-0">
                  <Image src={post.imageUrl} alt="" width={64} height={64} className="w-16 h-16 object-cover" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Link
                href={`/admin/posts/${post.id}/edit`}
                className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Link>
              <AdminPostDeleteButton postId={post.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
