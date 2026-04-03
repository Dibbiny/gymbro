"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Dumbbell, RefreshCw, Play, ChevronLeft } from "lucide-react";
import Link from "next/link";

type Focus = "FULL_BODY" | "UPPER_BODY" | "LOWER_BODY" | "PULL" | "PUSH" | "LEGS";

const FOCUS_OPTIONS: { value: Focus; label: string; description: string }[] = [
  { value: "FULL_BODY", label: "Full Body", description: "All muscle groups" },
  { value: "UPPER_BODY", label: "Upper Body", description: "Chest, shoulders, arms" },
  { value: "LOWER_BODY", label: "Lower Body", description: "Glutes, hamstrings" },
  { value: "PULL", label: "Pull", description: "Back, biceps" },
  { value: "PUSH", label: "Push", description: "Chest, shoulders, triceps" },
  { value: "LEGS", label: "Legs", description: "Quads, hamstrings, calves" },
];

const SET_OPTIONS = [9, 12, 15, 18, 21, 24];

const CATEGORY_LABELS: Record<string, string> = {
  UPPER_BODY: "Upper Body",
  LOWER_BODY: "Lower Body",
  PULL: "Pull",
  PUSH: "Push",
  LEGS: "Legs",
};

interface GeneratedExercise {
  exerciseId: string;
  exerciseName: string;
  category: string;
  sets: number;
  reps: number;
  restSeconds: number;
  orderIndex: number;
}

export default function RandomDayPage() {
  const router = useRouter();
  const [focus, setFocus] = useState<Focus>("FULL_BODY");
  const [totalSets, setTotalSets] = useState(15);
  const [generated, setGenerated] = useState<GeneratedExercise[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch("/api/random-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ focus, totalSets }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to generate");
        return;
      }
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
      if (!res.ok) {
        toast.error("Failed to start session");
        return;
      }
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

      {/* Focus selector */}
      <div className="space-y-2">
        <p className="text-sm font-semibold">Focus</p>
        <div className="grid grid-cols-2 gap-2">
          {FOCUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { setFocus(opt.value); setGenerated(null); }}
              className={cn(
                "rounded-xl border p-3 text-left transition-colors",
                focus === opt.value
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-muted"
              )}
            >
              <p className={cn("text-sm font-semibold", focus === opt.value && "text-primary")}>
                {opt.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
            </button>
          ))}
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
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
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
              <Badge variant="secondary">{FOCUS_OPTIONS.find(f => f.value === focus)?.label}</Badge>
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
                        <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[ex.category]}</p>
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
