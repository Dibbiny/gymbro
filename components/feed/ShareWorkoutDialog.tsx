"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Dumbbell, Trophy, Share2 } from "lucide-react";

interface Props {
  sessionId?: string;
  enrollmentId?: string;
  postType: "TRAINING_DAY" | "PLAN_COMPLETION";
  open: boolean;
  onClose: () => void;
  onPosted?: () => void;
}

export function ShareWorkoutDialog({
  sessionId,
  enrollmentId,
  postType,
  open,
  onClose,
  onPosted,
}: Props) {
  const [body, setBody] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  async function handleShare() {
    setIsPosting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() || undefined, sessionId, enrollmentId, postType }),
      });
      if (!res.ok) {
        toast.error("Failed to share");
        return;
      }
      toast.success("Posted to your feed!");
      setBody("");
      onPosted?.();
      onClose();
    } finally {
      setIsPosting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {postType === "PLAN_COMPLETION" ? (
              <><Trophy className="h-5 w-5 text-yellow-500" /> Share your achievement!</>
            ) : (
              <><Dumbbell className="h-5 w-5 text-primary" /> Share your workout!</>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <textarea
            rows={3}
            placeholder={
              postType === "PLAN_COMPLETION"
                ? "You finished the plan! Say something..."
                : "How did it go? Add a note..."
            }
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={1000}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Skip
            </Button>
            <Button className="flex-1" onClick={handleShare} disabled={isPosting}>
              <Share2 className="h-4 w-4 mr-1.5" />
              {isPosting ? "Posting..." : "Share"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
