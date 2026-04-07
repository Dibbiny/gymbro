"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Dumbbell, Trophy, Share2, ImagePlus, X, Sparkles, Loader2 } from "lucide-react";

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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !sessionId) return;
    setAiSummary(null);
    setLoadingSummary(true);
    fetch(`/api/sessions/${sessionId}/ai-summary`, { method: "POST" })
      .then((r) => r.json())
      .then((d) => { if (d.summary) setAiSummary(d.summary); })
      .catch(() => {})
      .finally(() => setLoadingSummary(false));
  }, [open, sessionId]);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleShare() {
    setIsPosting(true);
    try {
      let imageUrl: string | undefined;

      if (imageFile) {
        const fd = new FormData();
        fd.append("file", imageFile);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok) { toast.error(uploadJson.error ?? "Image upload failed"); return; }
        imageUrl = uploadJson.url;
      }

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: body.trim() || undefined,
          imageUrl,
          sessionId,
          enrollmentId,
          postType,
        }),
      });
      if (!res.ok) { toast.error("Failed to share"); return; }
      toast.success("Posted to your feed!");
      setBody("");
      removeImage();
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

        <div className="space-y-3 pt-1">
          {/* AI summary suggestion */}
          {loadingSummary && (
            <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
              AI is writing your recap...
            </div>
          )}
          {aiSummary && !loadingSummary && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-xs font-medium text-primary">AI recap</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{aiSummary}</p>
              <button
                type="button"
                onClick={() => setBody(aiSummary)}
                className="text-xs font-medium text-primary hover:underline"
              >
                Use this caption
              </button>
            </div>
          )}

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

          {/* Image preview */}
          {imagePreview ? (
            <div className="relative rounded-xl overflow-hidden">
              <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-cover" />
              <button
                onClick={removeImage}
                className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 w-full rounded-lg border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
            >
              <ImagePlus className="h-4 w-4" />
              Add photo
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Skip</Button>
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
