"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ImagePlus, X } from "lucide-react";
import { resizeImage } from "@/lib/resizeImage";

interface Props {
  postId?: string;
  initialBody?: string;
  initialImageUrl?: string | null;
}

export function AdminPostForm({ postId, initialBody = "", initialImageUrl }: Props) {
  const router = useRouter();
  const isEditing = !!postId;
  const [body, setBody] = useState(initialBody);
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl ?? null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initialImageUrl ?? null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setImageUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit() {
    if (!body.trim() && !imagePreview) {
      toast.error("Add some text or an image");
      return;
    }
    setSubmitting(true);
    try {
      let finalImageUrl: string | null | undefined = imageUrl;

      if (imageFile) {
        const compressed = await resizeImage(imageFile);
        const fd = new FormData();
        fd.append("file", compressed);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok) { toast.error(uploadJson.error ?? "Image upload failed"); return; }
        finalImageUrl = uploadJson.url;
      } else if (!imagePreview) {
        finalImageUrl = null;
      }

      let res: Response;
      if (isEditing) {
        res = await fetch(`/api/posts/${postId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: body.trim() || undefined, imageUrl: finalImageUrl }),
        });
      } else {
        res = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: body.trim() || undefined, imageUrl: finalImageUrl ?? undefined, postType: "ANNOUNCEMENT" }),
        });
      }

      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to save post"); return; }
      toast.success(isEditing ? "Post updated!" : "Post published!");
      router.push("/admin/posts");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="body">Message</Label>
        <textarea
          id="body"
          rows={4}
          placeholder="Write your post..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={1000}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
        />
        <p className="text-xs text-muted-foreground text-right">{body.length}/1000</p>
      </div>

      {imagePreview ? (
        <div className="relative rounded-xl overflow-hidden">
          <img src={imagePreview} alt="Preview" className="w-full max-h-64 object-cover" />
          <button
            type="button"
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
          className="flex items-center gap-2 w-full rounded-lg border border-dashed border-border px-3 py-3 text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          <ImagePlus className="h-4 w-4" /> Add image (optional)
        </button>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => router.push("/admin/posts")} disabled={submitting}>
          Cancel
        </Button>
        <Button className="flex-1" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Saving..." : isEditing ? "Save changes" : "Publish"}
        </Button>
      </div>
    </div>
  );
}
