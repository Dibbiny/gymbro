"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface LikeButtonProps {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
}

export function LikeButton({ postId, initialLiked, initialCount }: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (loading) return;
    // Optimistic update
    setLiked((l) => !l);
    setCount((c) => (liked ? c - 1 : c + 1));
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
      if (!res.ok) {
        // Rollback
        setLiked((l) => !l);
        setCount((c) => (liked ? c + 1 : c - 1));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      aria-label={liked ? "Unlike" : "Like"}
    >
      <Heart
        className={cn(
          "h-4 w-4 transition-colors",
          liked ? "fill-red-500 text-red-500" : "fill-none"
        )}
      />
      <span>{count > 0 ? count : ""}</span>
    </button>
  );
}
