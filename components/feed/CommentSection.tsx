"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { formatDistanceToNow } from "@/lib/time";

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; username: string; avatarUrl: string | null };
}

interface CommentSectionProps {
  postId: string;
  initialComments: Comment[];
  commentCount: number;
}

export function CommentSection({ postId, initialComments, commentCount }: CommentSectionProps) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function loadComments() {
    if (loaded) { setOpen(true); return; }
    const res = await fetch(`/api/posts/${postId}/comments`);
    const data = await res.json();
    setComments(data.comments ?? []);
    setLoaded(true);
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setComments((c) => [...c, data.comment]);
        setText("");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => (open ? setOpen(false) : loadComments())}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {commentCount > 0 ? `${commentCount} comment${commentCount !== 1 ? "s" : ""}` : "Add a comment"}
      </button>

      {open && (
        <div className="space-y-3 pt-1">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                <AvatarImage src={c.author.avatarUrl ?? undefined} />
                <AvatarFallback className="text-[10px]">
                  {c.author.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="rounded-xl bg-muted px-3 py-2">
                  <span className="text-xs font-semibold">@{c.author.username} </span>
                  <span className="text-sm">{c.body}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 ml-2">
                  {formatDistanceToNow(new Date(c.createdAt))}
                </p>
              </div>
            </div>
          ))}

          <form onSubmit={submit} className="flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 h-8 text-sm"
              maxLength={500}
            />
            <Button type="submit" size="sm" disabled={sending || !text.trim()} className="h-8 px-2.5">
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
