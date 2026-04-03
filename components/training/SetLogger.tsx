"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SetLoggerProps {
  sessionId: string;
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  totalSets: number;
  defaultReps: number;
  onComplete: (weightKg: number | null, repsCompleted: number) => void;
  isSaved: boolean;
}

export function SetLogger({
  sessionId,
  exerciseId,
  exerciseName,
  setNumber,
  totalSets,
  defaultReps,
  onComplete,
  isSaved,
}: SetLoggerProps) {
  const [weight, setWeight] = useState<string>("");
  const [reps, setReps] = useState<string>(String(defaultReps));
  const [loadingLast, setLoadingLast] = useState(false);

  // Pre-populate with last session data
  useEffect(() => {
    setLoadingLast(true);
    fetch(`/api/sessions/${sessionId}/sets?exerciseId=${exerciseId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.lastLog) {
          if (d.lastLog.weightKg != null) setWeight(String(d.lastLog.weightKg));
          setReps(String(d.lastLog.repsCompleted));
        }
      })
      .finally(() => setLoadingLast(false));
  }, [exerciseId, sessionId]);

  function handleComplete() {
    const w = weight.trim() === "" ? null : parseFloat(weight);
    const r = parseInt(reps) || defaultReps;
    onComplete(isNaN(w!) ? null : w, r);
  }

  return (
    <div className={cn("rounded-xl border p-4 space-y-4 transition-colors", isSaved && "border-primary/40 bg-primary/5")}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Set {setNumber} / {totalSets}
        </span>
        {isSaved && (
          <span className="flex items-center gap-1 text-xs text-primary font-medium">
            <Check className="h-3.5 w-3.5" /> Logged
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Weight (kg)</label>
          <Input
            type="number"
            min={0}
            step={0.5}
            placeholder={loadingLast ? "Loading..." : "0"}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="text-center text-lg font-semibold h-12"
            disabled={isSaved}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Reps</label>
          <Input
            type="number"
            min={0}
            placeholder={String(defaultReps)}
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className="text-center text-lg font-semibold h-12"
            disabled={isSaved}
          />
        </div>
      </div>

      {!isSaved && (
        <Button className="w-full" onClick={handleComplete}>
          <Check className="h-4 w-4 mr-1.5" /> Done — set {setNumber}
        </Button>
      )}
    </div>
  );
}
