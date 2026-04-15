"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { RefreshCw, Play, ChevronLeft } from "lucide-react";
import Link from "next/link";

const MUSCLE_OPTIONS = [
  { value: "CHEST", label: "Chest" },
  { value: "BACK", label: "Back" },
  { value: "SHOULDERS", label: "Shoulders" },
  { value: "ARMS", label: "Arms" },
  { value: "LEGS", label: "Legs" },
  { value: "CORE", label: "Core" },
];

const SET_OPTIONS = [9, 12, 15, 18, 21, 24];

interface GeneratedExercise {
  exerciseId: string;
  exerciseName: string;
  movementTypes: string[];
  muscleGroups: string[];
  sets: number;
  reps: number;
  restSeconds: number;
  orderIndex: number;
}

export default function RandomDayPage() {
  const router = useRouter();
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [totalSets, setTotalSets] = useState(15);
  const [generated, setGenerated] = useState<GeneratedExercise[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);

  function toggleMuscle(value: string) {
    setSelectedMuscles((prev) =>
      prev.includes(value) ? prev.filter((m) => m !== value) : [...prev, value]
    );
    setGenerated(null);
  }

  const focusLabel = selectedMuscles.length === 0
    ? "Full Body"
    : selectedMuscles.map((m) => MUSCLE_OPTIONS.find((o) => o.value === m)?.label).join(", ");

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch("/api/random-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ muscleGroups: selectedMuscles, totalSets }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to generate"); return; }
      setGenerated(data.exercises);
    } finally {
      setLoading(false);
    }
  }

  async function handleStart() {
    if (!generated) return;
    setStarting(true);
    try {
      const res = await fetch("/api/random-day", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exercises: generated }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error("Failed to start session"); return; }
      router.push(`/train/session/${data.sessionId}`);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link href="/train" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Random Day</h1>
          <p className="text-xs text-muted-foreground">Auto-generate a workout on the fly</p>
        </div>
      </div>

      {/* Muscle group selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Muscle groups</p>
          {selectedMuscles.length > 0 && (
            <button
              type="button"
              onClick={() => { setSelectedMuscles([]); setGenerated(null); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {selectedMuscles.length === 0 ? "None selected — all muscles included" : `${selectedMuscles.length} selected`}
        </p>
        <div className="flex flex-wrap gap-2">
          {MUSCLE_OPTIONS.map((opt) => {
            const active = selectedMuscles.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleMuscle(opt.value)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors border",
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Total sets */}
      <div className="space-y-2">
        <p className="text-sm font-semibold">Total sets: <span className="text-primary">{totalSets}</span></p>
        <div className="flex gap-2 flex-wrap">
          {SET_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => { setTotalSets(n); setGenerated(null); }}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                totalSets === n
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-foreground hover:bg-muted"
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <Button className="w-full" onClick={handleGenerate} disabled={loading}>
        <RefreshCw className={cn("h-4 w-4 mr-1.5", loading && "animate-spin")} />
        {loading ? "Generating..." : generated ? "Regenerate" : "Generate workout"}
      </Button>

      {/* Generated exercises preview */}
      {generated && (
        <>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{generated.length} exercises · {totalSets} sets</p>
              <span className="text-xs text-muted-foreground">{focusLabel}</span>
            </div>

            {generated.map((ex, i) => (
              <Card key={ex.exerciseId} className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{ex.exerciseName}</p>
                        <p className="text-xs text-muted-foreground">{ex.muscleGroups.join(", ")}</p>
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{ex.sets} sets × {ex.reps} reps</p>
                      <p>{ex.restSeconds}s rest</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button className="w-full" size="lg" onClick={handleStart} disabled={starting}>
              <Play className="h-4 w-4 mr-1.5" />
              {starting ? "Starting..." : "Start this workout"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
