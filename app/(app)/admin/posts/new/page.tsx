import { AdminPostForm } from "@/components/admin/AdminPostForm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function NewAdminPostPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/admin/posts" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">New Post</h1>
      </div>
      <AdminPostForm />
    </div>
  );
}
