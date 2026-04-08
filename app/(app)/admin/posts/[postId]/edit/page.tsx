import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { AdminPostForm } from "@/components/admin/AdminPostForm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

interface Props {
  params: Promise<{ postId: string }>;
}

export default async function EditAdminPostPage({ params }: Props) {
  const { postId } = await params;

  const post = await db.post.findUnique({
    where: { id: postId, postType: "ANNOUNCEMENT" },
    select: { id: true, body: true, imageUrl: true },
  });

  if (!post) notFound();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/admin/posts" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">Edit Post</h1>
      </div>
      <AdminPostForm postId={post.id} initialBody={post.body ?? ""} initialImageUrl={post.imageUrl} />
    </div>
  );
}
