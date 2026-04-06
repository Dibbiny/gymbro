"use client";

import { Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Props {
  name: string;
  description?: string | null;
  demoUrl?: string | null;
  categories: string[];
}

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    // youtube.com/watch?v=ID
    const v = u.searchParams.get("v");
    if (v) return `https://www.youtube.com/embed/${v}`;
    // youtu.be/ID or youtube.com/shorts/ID
    const parts = u.pathname.split("/").filter(Boolean);
    const shortsIdx = parts.indexOf("shorts");
    if (shortsIdx !== -1 && parts[shortsIdx + 1]) {
      return `https://www.youtube.com/embed/${parts[shortsIdx + 1]}`;
    }
    if (u.hostname === "youtu.be" && parts[0]) {
      return `https://www.youtube.com/embed/${parts[0]}`;
    }
  } catch {
    // not a valid URL
  }
  return null;
}

export function ExerciseInfoButton({ name, description, demoUrl, categories }: Props) {
  const embedUrl = demoUrl ? getYouTubeEmbedUrl(demoUrl) : null;

  return (
    <Dialog>
      <DialogTrigger
        className="text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-1"
        aria-label={`Info about ${name}`}
      >
        <Info className="h-3.5 w-3.5" />
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
          {categories.length > 0 && (
            <p className="text-xs text-muted-foreground">{categories.join(" · ")}</p>
          )}
        </DialogHeader>

        {embedUrl && (
          <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted">
            <iframe
              src={embedUrl}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        )}

        {!description && !embedUrl && (
          <p className="text-sm text-muted-foreground">No additional info available for this exercise.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
