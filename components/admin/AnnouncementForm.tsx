"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AnnouncementForm({ adminId }: { adminId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) { toast.error("Title and body required"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      });
      if (!res.ok) { toast.error("Failed to create announcement"); return; }
      toast.success("Announcement posted");
      setTitle("");
      setBody("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border p-4">
      <div className="space-y-1.5">
        <Label htmlFor="ann-title">Title</Label>
        <Input
          id="ann-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. New exercises added!"
          maxLength={100}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ann-body">Body</Label>
        <textarea
          id="ann-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Announcement details..."
          rows={3}
          maxLength={1000}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
        />
      </div>
      <Button type="submit" size="sm" disabled={loading}>
        {loading ? "Posting..." : "Post announcement"}
      </Button>
    </form>
  );
}
