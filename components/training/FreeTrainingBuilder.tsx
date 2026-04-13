"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Plus, Minus, X, Dumbbell, Play, Loader2 } from "lucide-react";
import { ExercisePicker, PickableExercise } from "./ExercisePicker";

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
  const [creating, setCreating] = useState(false);
  const [starting, setStarting] = useState(false);

  function addExercise(ex: PickableExercise) {
    if (exercises.some((e) => e.exerciseId === ex.id)) {
      toast.info(`${ex.name} is already in your workout`);
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
  }

  async function quickCreate(name: string) {
    setCreating(true);
    try {
      const res = await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), quickAdd: true }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to create exercise"); return; }
      addExercise({ id: data.exercise.id, name: data.exercise.name, categories: [] });
    } finally {
      setCreating(false);
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

  const addedIds = exercises.map((e) => e.exerciseId);

  return (
    <div className="space-y-5">
      {/* Exercise picker */}
      <ExercisePicker
        addedIds={addedIds}
        onAdd={addExercise}
        onQuickCreate={quickCreate}
        creating={creating}
      />

      {/* Selected exercises */}
      {exercises.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <p className="text-sm font-semibold">
              Your workout · {exercises.length} exercise{exercises.length !== 1 ? "s" : ""}
            </p>
            <div className="space-y-2">
              {exercises.map((ex, i) => (
                <div key={ex.exerciseId} className="rounded-xl border p-3 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {i + 1}
                      </span>
                      <p className="text-sm font-semibold truncate">{ex.exerciseName}</p>
                    </div>
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

            <Button className="w-full" onClick={handleStart} disabled={starting}>
              {starting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Starting...</>
              ) : (
                <><Play className="h-4 w-4 mr-2" /> Start Training · {exercises.length} exercise{exercises.length !== 1 ? "s" : ""}</>
              )}
            </Button>
          </div>
        </>
      )}

      {exercises.length === 0 && (
        <div className="rounded-xl border border-dashed p-10 text-center space-y-2">
          <Dumbbell className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Add exercises above to build your workout
          </p>
        </div>
      )}
    </div>
  );
}
