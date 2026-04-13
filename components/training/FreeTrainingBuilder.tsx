"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Minus, X, Dumbbell, Play, Loader2 } from "lucide-react";

interface ExerciseOption {
  id: string;
  name: string;
  categories: { name: string }[];
}

interface FreeExercise {
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: number;
  restSeconds: number;
  orderIndex: number;
}

interface Props {
  initialExercises?: FreeExercise[];
}

export function FreeTrainingBuilder({ initialExercises = [] }: Props) {
  const router = useRouter();
  const [exercises, setExercises] = useState<FreeExercise[]>(initialExercises);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ExerciseOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [starting, setStarting] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/exercises?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setResults(data.exercises ?? []);
        setShowDropdown(true);
      } catch {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function selectExercise(ex: ExerciseOption) {
    if (exercises.some((e) => e.exerciseId === ex.id)) {
      toast.info(`${ex.name} is already in your workout`);
      setQuery("");
      setShowDropdown(false);
      return;
    }
    setExercises((prev) => [
      ...prev,
      {
        exerciseId: ex.id,
        exerciseName: ex.name,
        sets: 3,
        reps: 10,
        restSeconds: 90,
        orderIndex: prev.length,
      },
    ]);
    setQuery("");
    setShowDropdown(false);
  }

  async function quickAdd(name: string) {
    setSearching(true);
    try {
      const res = await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), quickAdd: true }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to create exercise"); return; }
      selectExercise({ id: data.exercise.id, name: data.exercise.name, categories: [] });
    } finally {
      setSearching(false);
    }
  }

  function removeExercise(index: number) {
    setExercises((prev) =>
      prev.filter((_, i) => i !== index).map((e, i) => ({ ...e, orderIndex: i }))
    );
  }

  function updateSets(index: number, delta: number) {
    setExercises((prev) =>
      prev.map((e, i) =>
        i === index ? { ...e, sets: Math.max(1, Math.min(20, e.sets + delta)) } : e
      )
    );
  }

  function updateReps(index: number, value: string) {
    const n = parseInt(value);
    if (!isNaN(n) && n >= 1 && n <= 100) {
      setExercises((prev) => prev.map((e, i) => (i === index ? { ...e, reps: n } : e)));
    }
  }

  async function handleStart() {
    if (exercises.length === 0) return;
    setStarting(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ freeExercises: exercises }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to start session"); return; }
      router.push(`/train/session/${data.session.id}`);
    } finally {
      setStarting(false);
    }
  }

  const exactMatch = results.some(
    (r) => r.name.toLowerCase() === query.trim().toLowerCase()
  );

  return (
    <div className="space-y-4">
      {/* Search box */}
      <div className="relative" ref={searchRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search exercises to add..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => { if (results.length > 0 || query.trim()) setShowDropdown(true); }}
            className="pl-9"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {showDropdown && (query.trim()) && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border bg-background shadow-lg overflow-hidden max-h-64 overflow-y-auto">
            {results.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectExercise(ex)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-muted transition-colors border-b border-border/50 last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{ex.name}</p>
                  {ex.categories.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {ex.categories.map((c) => c.name).join(", ")}
                    </p>
                  )}
                </div>
                <Plus className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
              </button>
            ))}
            {!exactMatch && query.trim() && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => quickAdd(query.trim())}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-muted transition-colors text-primary"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium">Create &quot;{query.trim()}&quot;</span>
              </button>
            )}
            {results.length === 0 && !searching && exactMatch && (
              <p className="px-3 py-2.5 text-sm text-muted-foreground">No exercises found</p>
            )}
          </div>
        )}
      </div>

      {/* Exercise list */}
      {exercises.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center space-y-2">
          <Dumbbell className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Search and add exercises to build your workout
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {exercises.map((ex, i) => (
            <div key={ex.exerciseId} className="rounded-xl border p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold truncate flex-1">{ex.exerciseName}</p>
                <button
                  type="button"
                  onClick={() => removeExercise(i)}
                  className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-5">
                {/* Sets */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Sets</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateSets(i, -1)}
                      disabled={ex.sets <= 1}
                      className="h-6 w-6 rounded border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40 transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-sm font-semibold w-5 text-center">{ex.sets}</span>
                    <button
                      type="button"
                      onClick={() => updateSets(i, +1)}
                      disabled={ex.sets >= 20}
                      className="h-6 w-6 rounded border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40 transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                {/* Reps */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Target reps</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={ex.reps}
                    onChange={(e) => updateReps(i, e.target.value)}
                    className="w-14 h-7 rounded border border-input bg-background px-2 text-sm text-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Start button */}
      {exercises.length > 0 && (
        <Button className="w-full" onClick={handleStart} disabled={starting}>
          {starting ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Starting...</>
          ) : (
            <><Play className="h-4 w-4 mr-2" /> Start Training · {exercises.length} exercise{exercises.length !== 1 ? "s" : ""}</>
          )}
        </Button>
      )}
    </div>
  );
}
