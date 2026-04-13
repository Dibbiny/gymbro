"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExerciseAdminActions } from "./ExerciseAdminActions";

interface Exercise {
  id: string;
  name: string;
  description: string | null;
  demoUrl: string | null;
  movementTypes: string[];
  muscleGroups: string[];
}

interface Props {
  exercises: Exercise[];
  label: string;
  dimmed?: boolean;
}

export function AdminExerciseList({ exercises, label, dimmed }: Props) {
  const [search, setSearch] = useState("");
  const [muscleGroupFilters, setMuscleGroupFilters] = useState<string[]>([]);

  // Derive unique muscle groups from exercises
  const allMuscleGroups = useMemo(() => {
    const set = new Set<string>();
    for (const ex of exercises) {
      for (const mg of ex.muscleGroups) {
        set.add(mg);
      }
    }
    return Array.from(set).sort();
  }, [exercises]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return exercises.filter((ex) => {
      const matchesSearch = !q || ex.name.toLowerCase().includes(q) || ex.description?.toLowerCase().includes(q);
      const matchesMuscleGroup = muscleGroupFilters.length === 0 || muscleGroupFilters.some((mg) => ex.muscleGroups.includes(mg));
      return matchesSearch && matchesMuscleGroup;
    });
  }, [exercises, search, muscleGroupFilters]);

  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-sm text-muted-foreground">{label} ({exercises.length})</h2>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search..."
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

      {/* Muscle group filter pills */}
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => setMuscleGroupFilters([])}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
            muscleGroupFilters.length === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          All
        </button>
        {allMuscleGroups.map((mg) => (
          <button
            key={mg}
            onClick={() =>
              setMuscleGroupFilters((prev) =>
                prev.includes(mg) ? prev.filter((g) => g !== mg) : [...prev, mg]
              )
            }
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              muscleGroupFilters.includes(mg) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {mg}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} of {exercises.length}</p>

      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No exercises match</p>
        ) : (
          filtered.map((ex) => (
            <div
              key={ex.id}
              className={cn(
                "flex items-center justify-between rounded-lg border px-3 py-2 gap-2",
                dimmed && "opacity-70"
              )}
            >
              <div className="min-w-0">
                <span className="text-sm font-medium">{ex.name}</span>
                <span className="text-xs text-muted-foreground ml-2">{ex.muscleGroups.join(", ")}</span>
              </div>
              <ExerciseAdminActions exercise={ex} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
