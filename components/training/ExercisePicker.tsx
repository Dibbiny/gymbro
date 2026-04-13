"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search, Plus, Loader2, ChevronDown, ChevronRight } from "lucide-react";

export interface PickableExercise {
  id: string;
  name: string;
  movementTypes: string[];
  muscleGroups: string[];
}

interface Props {
  addedIds: string[];
  onAdd: (exercise: PickableExercise) => void;
  onQuickCreate: (name: string) => Promise<void>;
  creating?: boolean;
}

export function ExercisePicker({ addedIds, onAdd, onQuickCreate, creating }: Props) {
  const [tab, setTab] = useState<"search" | "browse">("search");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PickableExercise[]>([]);
  const [searching, setSearching] = useState(false);
  const [allExercises, setAllExercises] = useState<PickableExercise[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load all exercises when switching to browse tab
  useEffect(() => {
    if (tab !== "browse" || allExercises.length > 0) return;
    setLoadingAll(true);
    fetch("/api/exercises")
      .then((r) => r.json())
      .then((d) => setAllExercises(d.exercises ?? []))
      .catch(() => {})
      .finally(() => setLoadingAll(false));
  }, [tab]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/exercises?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setSearchResults(data.exercises ?? []);
      } catch {}
      finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Group all exercises by first muscle group for browse tab
  const byMuscle = new Map<string, PickableExercise[]>();
  for (const ex of allExercises) {
    const group = ex.muscleGroups[0] ?? "Other";
    if (!byMuscle.has(group)) byMuscle.set(group, []);
    byMuscle.get(group)!.push(ex);
  }
  const muscleGroups = Array.from(byMuscle.entries()).sort(([a], [b]) => a.localeCompare(b));

  const exactMatch = searchResults.some(
    (r) => r.name.toLowerCase() === query.trim().toLowerCase()
  );

  function ExerciseRow({ ex }: { ex: PickableExercise }) {
    const added = addedIds.includes(ex.id);
    return (
      <button
        type="button"
        disabled={added}
        onClick={() => !added && onAdd(ex)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-muted disabled:opacity-50 disabled:cursor-default transition-colors"
      >
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{ex.name}</p>
          {ex.muscleGroups.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {ex.muscleGroups.join(", ")}
            </p>
          )}
        </div>
        {added ? (
          <span className="text-xs text-muted-foreground shrink-0 ml-2">Added</span>
        ) : (
          <Plus className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
        )}
      </button>
    );
  }

  return (
    <div className="space-y-3">
      {/* Tab switcher */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {(["search", "browse"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
              tab === t
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "search" ? "Search" : "Browse by muscle"}
          </button>
        ))}
      </div>

      {/* Search tab */}
      {tab === "search" && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search exercises..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
            {(searching || creating) && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {(searchResults.length > 0 || (query.trim() && !exactMatch)) && (
            <div className="rounded-xl border overflow-hidden divide-y divide-border/50">
              {searchResults.map((ex) => (
                <ExerciseRow key={ex.id} ex={ex} />
              ))}
              {!exactMatch && query.trim() && (
                <button
                  type="button"
                  onClick={() => onQuickCreate(query.trim())}
                  disabled={creating}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-muted transition-colors text-primary disabled:opacity-50"
                >
                  <Plus className="h-4 w-4 shrink-0" />
                  <span className="text-sm font-medium">
                    Create &quot;{query.trim()}&quot;
                  </span>
                </button>
              )}
            </div>
          )}

          {!query.trim() && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Type to search, or switch to Browse to explore by muscle group
            </p>
          )}
        </div>
      )}

      {/* Browse tab */}
      {tab === "browse" && (
        <div className="space-y-1.5">
          {loadingAll && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loadingAll &&
            muscleGroups.map(([groupName, exs]) => {
              const isOpen = openSections[groupName] ?? false;
              return (
                <div key={groupName} className="rounded-xl border overflow-hidden">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenSections((prev) => ({ ...prev, [groupName]: !isOpen }))
                    }
                    className="w-full flex items-center justify-between px-3 py-2.5 font-medium text-sm hover:bg-muted transition-colors"
                  >
                    <span>{groupName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{exs.length}</span>
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="border-t border-border/50 divide-y divide-border/50">
                      {exs.map((ex) => (
                        <ExerciseRow key={ex.id} ex={ex} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
