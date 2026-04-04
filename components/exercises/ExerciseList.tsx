"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Clock, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Exercise {
  id: string;
  name: string;
  categories: { id: string; name: string }[];
  description: string | null;
  demoUrl: string | null;
  status: string;
}

interface Props {
  exercises: Exercise[];
  pendingExercises: Exercise[];
}

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0];
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const match = u.pathname.match(/\/(?:embed|shorts|v)\/([^/?]+)/);
      if (match) return match[1];
    }
  } catch {}
  return null;
}

export function ExerciseList({ exercises, pendingExercises }: Props) {
  const [search, setSearch] = useState("");
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [selected, setSelected] = useState<Exercise | null>(null);

  // Derive unique categories from exercises
  const allCategories = useMemo(() => {
    const map = new Map<string, string>();
    for (const ex of exercises) {
      for (const cat of ex.categories) {
        map.set(cat.id, cat.name);
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [exercises]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return exercises.filter((ex) => {
      const matchesSearch = !q || ex.name.toLowerCase().includes(q) || ex.description?.toLowerCase().includes(q);
      const matchesCategory = categoryFilters.length === 0 || categoryFilters.every((id) => ex.categories.some((c) => c.id === id));
      return matchesSearch && matchesCategory;
    });
  }, [exercises, search, categoryFilters]);

  const youtubeId = selected?.demoUrl ? extractYouTubeId(selected.demoUrl) : null;

  return (
    <>
      {/* Search + filter */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search exercises..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setCategoryFilters([])}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              categoryFilters.length === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            All
          </button>
          {allCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() =>
                setCategoryFilters((prev) =>
                  prev.includes(cat.id) ? prev.filter((id) => id !== cat.id) : [...prev, cat.id]
                )
              }
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                categoryFilters.includes(cat.id) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Pending exercises */}
      {pendingExercises.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Pending review ({pendingExercises.length})
          </p>
          {pendingExercises.map((ex) => (
            <div key={ex.id} className="flex items-center justify-between rounded-lg border px-3 py-2 opacity-60">
              <div>
                <p className="text-sm font-medium">{ex.name}</p>
                <p className="text-xs text-muted-foreground">{ex.categories.map((c) => c.name).join(", ")}</p>
              </div>
              <Badge variant="secondary" className="text-xs">Pending</Badge>
            </div>
          ))}
        </div>
      )}

      {/* Exercise list */}
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">{filtered.length} exercise{filtered.length !== 1 ? "s" : ""}</p>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No exercises found</p>
        ) : (
          filtered.map((ex) => (
            <button
              key={ex.id}
              onClick={() => setSelected(ex)}
              className="w-full text-left rounded-lg border px-3 py-2.5 hover:bg-muted/50 transition-colors flex items-center justify-between gap-2"
            >
              <p className="text-sm font-medium">{ex.name}</p>
              <Badge variant="outline" className="text-xs shrink-0">
                {ex.categories.map((c) => c.name).join(", ")}
              </Badge>
            </button>
          ))
        )}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-sm w-full">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.name}</DialogTitle>
                <Badge variant="outline" className="w-fit text-xs mt-1">
                  {selected.categories.map((c) => c.name).join(", ")}
                </Badge>
              </DialogHeader>

              <div className="space-y-4">
                {selected.description && (
                  <p className="text-sm text-muted-foreground">{selected.description}</p>
                )}

                {youtubeId ? (
                  <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
                    <iframe
                      src={`https://www.youtube.com/embed/${youtubeId}`}
                      title={selected.name}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  </div>
                ) : selected.demoUrl ? (
                  <a
                    href={selected.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    View demo →
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No demo available</p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
