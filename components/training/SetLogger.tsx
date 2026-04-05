"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface SetLoggerProps {
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  totalSets: number;
  defaultReps: number;
  savedWeight?: number | null;
  savedReps?: number | null;
  onComplete: (weightKg: number | null, repsCompleted: number) => void;
  isSaved: boolean;
}

export function SetLogger({
  sessionId,
  exerciseId,
  setNumber,
  totalSets,
  defaultReps,
  savedWeight,
  savedReps,
  onComplete,
  isSaved,
}: SetLoggerProps) {
  const [editing, setEditing] = useState(!isSaved);
  const [weight, setWeight] = useState<string>(savedWeight != null ? String(savedWeight) : "");
  const [reps, setReps] = useState<string>(savedReps != null ? String(savedReps) : String(defaultReps));
  const [loadingLast, setLoadingLast] = useState(false);

  // Pre-populate with last session data only on first render of an unsaved set
  useEffect(() => {
    if (isSaved) return; // already has data or we don't want to overwrite
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

  // Sync edit fields when saved values change (e.g. after successful save)
  useEffect(() => {
    if (isSaved && !editing) {
      if (savedWeight != null) setWeight(String(savedWeight));
      if (savedReps != null) setReps(String(savedReps));
    }
  }, [isSaved, savedWeight, savedReps]);

  function handleComplete() {
    const w = weight.trim() === "" ? null : parseFloat(weight);
    const r = parseInt(reps) || defaultReps;
    onComplete(isNaN(w!) ? null : w, r);
    setEditing(false);
  }

  const showForm = !isSaved || editing;

  return (
    <div className={cn("rounded-xl border p-4 space-y-4 transition-colors", isSaved && !editing && "border-primary/40 bg-primary/5")}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Set {setNumber} / {totalSets}
        </span>
        {isSaved && !editing ? (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-primary font-medium">
              <Check className="h-3.5 w-3.5" />
              {savedWeight != null ? `${savedWeight} kg` : "BW"} × {savedReps} reps
            </span>
            <button
              onClick={() => setEditing(true)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Edit this set"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}
      </div>

      {showForm && (
        <>
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
              />
            </div>
          </div>

          <div className="flex gap-2">
            {editing && isSaved && (
              <Button variant="outline" className="flex-1" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            )}
            <Button className="flex-1" onClick={handleComplete}>
              <Check className="h-4 w-4 mr-1.5" />
              {editing && isSaved ? "Save edit" : `Done — set ${setNumber}`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
