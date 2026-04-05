"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Pencil, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface SetLoggerProps {
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  totalSets: number;
  defaultReps: number;
  savedWeight?: number | null;
  savedReps?: number | null;
  savedNotes?: string | null;
  lastNotes?: string | null; // note from previous session for this exercise
  onComplete: (weightKg: number | null, repsCompleted: number, notes: string | null) => void;
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
  savedNotes,
  lastNotes,
  onComplete,
  isSaved,
}: SetLoggerProps) {
  const [editing, setEditing] = useState(!isSaved);
  const [weight, setWeight] = useState<string>(savedWeight != null ? String(savedWeight) : "");
  const [reps, setReps] = useState<string>(savedReps != null ? String(savedReps) : String(defaultReps));
  const [notes, setNotes] = useState<string>(savedNotes ?? "");
  const [notesOpen, setNotesOpen] = useState(!!(savedNotes));
  const [loadingLast, setLoadingLast] = useState(false);
  const [lastLogNotes, setLastLogNotes] = useState<string | null>(lastNotes ?? null);

  // Pre-populate with last session data only on first render of an unsaved set
  useEffect(() => {
    if (isSaved) return;
    setLoadingLast(true);
    fetch(`/api/sessions/${sessionId}/sets?exerciseId=${exerciseId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.lastLog) {
          if (d.lastLog.weightKg != null) setWeight(String(d.lastLog.weightKg));
          setReps(String(d.lastLog.repsCompleted));
          if (d.lastLog.notes) setLastLogNotes(d.lastLog.notes);
        }
      })
      .finally(() => setLoadingLast(false));
  }, [exerciseId, sessionId]);

  // Sync fields when saved values change (e.g. after upsert)
  useEffect(() => {
    if (isSaved && !editing) {
      if (savedWeight != null) setWeight(String(savedWeight));
      if (savedReps != null) setReps(String(savedReps));
      setNotes(savedNotes ?? "");
    }
  }, [isSaved, savedWeight, savedReps, savedNotes]);

  function handleComplete() {
    const w = weight.trim() === "" ? null : parseFloat(weight);
    const r = parseInt(reps) || defaultReps;
    onComplete(isNaN(w!) ? null : w, r, notes.trim() || null);
    setEditing(false);
  }

  const showForm = !isSaved || editing;

  return (
    <div className={cn("rounded-xl border p-4 space-y-3 transition-colors", isSaved && !editing && "border-primary/40 bg-primary/5")}>
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

      {/* Previous session note hint */}
      {!isSaved && lastLogNotes && (
        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-2.5 py-1.5">
          💬 Last time: {lastLogNotes}
        </p>
      )}

      {/* Saved note display (not editing) */}
      {isSaved && !editing && savedNotes && (
        <p className="text-xs text-muted-foreground italic px-1">💬 {savedNotes}</p>
      )}

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

          {/* Notes toggle */}
          {!notesOpen ? (
            <button
              type="button"
              onClick={() => setNotesOpen(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5" /> Add a note
            </button>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Note</label>
              <textarea
                rows={2}
                placeholder="e.g. try heavier weight next time"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
          )}

          <div className="flex gap-2">
            {editing && isSaved && (
              <Button variant="outline" className="flex-1" onClick={() => { setEditing(false); setNotesOpen(!!savedNotes); }}>
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
