"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTrainingSession, ExerciseEntry, PreloadedSetLog } from "@/store/trainingSession";
import { useTimerWorker } from "@/hooks/useTimerWorker";
import { ElapsedTimer } from "@/components/training/ElapsedTimer";
import { RestCountdown } from "@/components/training/RestCountdown";
import { SetLogger } from "@/components/training/SetLogger";
import { ExercisePicker, PickableExercise } from "@/components/training/ExercisePicker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Pause, Play, Flag, ChevronLeft, ChevronRight, Dumbbell, Info, Plus, Minus, Sparkles, SkipForward } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ShareWorkoutDialog } from "@/components/feed/ShareWorkoutDialog";

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

interface Props {
  sessionId: string;
  exercises: ExerciseEntry[];
  planDayLabel: string | null;
  isRandomDay?: boolean;
  preloadedLogs?: PreloadedSetLog[];
  pausedDuration?: number;
  sessionNotes?: string | null;
}

export function SessionClient({
  sessionId,
  exercises: initialExercises,
  planDayLabel,
  isRandomDay = false,
  preloadedLogs = [],
  pausedDuration = 0,
  sessionNotes,
}: Props) {
  const router = useRouter();
  const [isFinishing, setIsFinishing] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [addingExercise, setAddingExercise] = useState(false);
  // Per-exercise set count overrides (exerciseId → total sets)
  const [setCountOverrides, setSetCountOverrides] = useState<Map<string, number>>(new Map());
  const [shareDialog, setShareDialog] = useState<{
    sessionId: string;
    enrollmentId?: string;
    planCompleted: boolean;
  } | null>(null);
  const [overloadHints, setOverloadHints] = useState<Map<string, string>>(new Map());

  const {
    initSession,
    resumeSession,
    currentExerciseIndex,
    currentSet,
    exercises,
    skippedExerciseIds,
    setLogs,
    isPaused,
    isResting,
    restSecondsLeft,
    elapsedSeconds,
    logSet,
    markSetSaved,
    startRest,
    stopRest,
    addExerciseEntry,
    skipExercise,
    unskipExercise,
    reset,
  } = useTrainingSession();

  const isResuming = pausedDuration > 0 || preloadedLogs.length > 0;
  const { pause, resume, startRest: workerStartRest, skipRest } = useTimerWorker(sessionId, pausedDuration);

  // Init store on mount
  useEffect(() => {
    if (isResuming) {
      resumeSession(sessionId, initialExercises, preloadedLogs, pausedDuration);
    } else {
      initSession(sessionId, initialExercises);
    }
    return () => reset();
  }, [sessionId]);

  // Periodically persist elapsed time so the timer survives page reloads
  useEffect(() => {
    const interval = setInterval(() => {
      const { elapsedSeconds: elapsed, isPaused: paused } = useTrainingSession.getState();
      if (!paused && elapsed > 0) {
        fetch(`/api/sessions/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pausedDuration: elapsed }),
        }).catch(() => {});
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [sessionId]);

  // Fetch overload hints once on mount
  useEffect(() => {
    fetch(`/api/sessions/${sessionId}/overload-hints`)
      .then((r) => r.json())
      .then((d) => {
        if (d.hints) {
          const map = new Map<string, string>();
          for (const h of d.hints) map.set(h.exerciseId, h.hint);
          setOverloadHints(map);
        }
      })
      .catch(() => {});
  }, [sessionId]);

  const currentExercise = exercises[currentExerciseIndex];

  function effectiveSets(ex: ExerciseEntry) {
    return setCountOverrides.get(ex.exerciseId) ?? ex.sets;
  }

  function getSetLog(exerciseId: string, setNumber: number) {
    return setLogs.find((l) => l.exerciseId === exerciseId && l.setNumber === setNumber);
  }

  function addSet(exerciseId: string, currentCount: number) {
    const newCount = currentCount + 1;
    setSetCountOverrides((prev) => new Map(prev).set(exerciseId, newCount));
    const currentSetLog = getSetLog(exerciseId, currentSet);
    if (currentSetLog?.saved) {
      useTrainingSession.setState({ currentSet: newCount });
    }
  }

  function removeSet(ex: ExerciseEntry, currentCount: number) {
    if (currentCount <= 1) return;
    const newCount = currentCount - 1;
    setSetCountOverrides((prev) => new Map(prev).set(ex.exerciseId, newCount));
    if (currentSet > newCount) {
      useTrainingSession.setState({ currentSet: newCount });
    }
  }

  // Find next non-skipped exercise index after the given index
  function nextActiveIndex(fromIndex: number): number | null {
    for (let i = fromIndex + 1; i < exercises.length; i++) {
      if (!skippedExerciseIds.includes(exercises[i].exerciseId)) return i;
    }
    return null;
  }

  // All remaining exercises (after current) are skipped/done
  function isEffectivelyLastExercise(): boolean {
    return nextActiveIndex(currentExerciseIndex) === null;
  }

  async function handleSetComplete(weightKg: number | null, repsCompleted: number, notes: string | null, setNumber?: number) {
    if (!currentExercise) return;
    const targetSet = setNumber ?? currentSet;

    logSet({
      exerciseId: currentExercise.exerciseId,
      setNumber: targetSet,
      weightKg,
      repsCompleted,
      notes,
      saved: false,
    });

    const res = await fetch(`/api/sessions/${sessionId}/sets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exerciseId: currentExercise.exerciseId,
        setNumber: targetSet,
        weightKg,
        repsCompleted,
        ...(notes ? { notes } : {}),
      }),
    });

    if (res.ok) {
      markSetSaved(currentExercise.exerciseId, targetSet);
    } else {
      toast.error("Failed to save set — check your connection");
      return;
    }

    if (setNumber !== undefined) return;

    const totalSets = effectiveSets(currentExercise);
    const isLastSetOfExercise = currentSet >= totalSets;

    if (isLastSetOfExercise && isEffectivelyLastExercise()) {
      setShowFinishConfirm(true);
      return;
    }

    startRest();
    workerStartRest(currentExercise.restSeconds);

    if (currentSet < totalSets) {
      useTrainingSession.setState({ currentSet: currentSet + 1 });
    } else {
      const next = nextActiveIndex(currentExerciseIndex);
      if (next !== null) {
        useTrainingSession.setState({ currentExerciseIndex: next, currentSet: 1 });
      }
    }
  }

  function handleSkipExercise() {
    skipExercise(currentExercise.exerciseId);
    const next = nextActiveIndex(currentExerciseIndex);
    if (next !== null) {
      useTrainingSession.setState({ currentExerciseIndex: next, currentSet: 1 });
    } else {
      // All remaining are skipped — offer to finish
      setShowFinishConfirm(true);
    }
  }

  async function handleAddExercise(ex: PickableExercise) {
    const newEntry: ExerciseEntry = {
      planDayExerciseId: `added-${ex.id}`,
      exerciseId: ex.id,
      exerciseName: ex.name,
      movementTypes: ex.movementTypes ?? [],
      muscleGroups: ex.muscleGroups ?? [],
      sets: 3,
      reps: 10,
      restSeconds: 90,
      orderIndex: exercises.length,
    };
    addExerciseEntry(newEntry);

    // Persist to session notes so it survives a page reload
    try {
      let notesObj: Record<string, unknown> = {};
      try { notesObj = sessionNotes ? JSON.parse(sessionNotes) : {}; } catch {}
      const currentExtras = Array.isArray(notesObj.extraExercises) ? notesObj.extraExercises : [];
      if (!currentExtras.some((e: any) => e.exerciseId === ex.id)) {
        notesObj.extraExercises = [
          ...currentExtras,
          { exerciseId: ex.id, exerciseName: ex.name, sets: 3, reps: 10, restSeconds: 90 },
        ];
      }
      await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: JSON.stringify(notesObj) }),
      });
    } catch {}

    setShowAddExercise(false);
    toast.success(`${ex.name} added to your workout`);
  }

  async function handleQuickCreateExercise(name: string) {
    setAddingExercise(true);
    try {
      const res = await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, quickAdd: true }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to create exercise"); return; }
      await handleAddExercise({ id: data.exercise.id, name: data.exercise.name, movementTypes: [], muscleGroups: [] });
    } finally {
      setAddingExercise(false);
    }
  }

  function handleTogglePause() {
    if (isPaused) {
      resume();
    } else {
      pause();
      fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pausedDuration: elapsedSeconds }),
      });
    }
  }

  async function handleFinish() {
    setIsFinishing(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ elapsedSeconds }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Failed to complete session");
        return;
      }
      toast.success(`Session complete! +${data.xpEarned} XP`);
      if (data.planCompleted) {
        toast.success("You finished the entire plan! Amazing work!");
      }
      reset();
      setShowFinishConfirm(false);
      setShareDialog({
        sessionId,
        enrollmentId: undefined,
        planCompleted: data.planCompleted,
      });
    } finally {
      setIsFinishing(false);
    }
  }

  if (!currentExercise && !shareDialog) {
    return (
      <div className="text-center py-16 space-y-3">
        <Dumbbell className="h-10 w-10 mx-auto text-muted-foreground" />
        <p className="text-muted-foreground">No exercises in this session.</p>
        <Button variant="outline" onClick={() => router.push("/train")}>Back to Train</Button>
      </div>
    );
  }

  const isCurrentSkipped = skippedExerciseIds.includes(currentExercise.exerciseId);

  return (
    <div className="space-y-4 pb-4">
      {/* Share dialog */}
      {shareDialog && (
        <ShareWorkoutDialog
          sessionId={shareDialog.sessionId}
          postType={shareDialog.planCompleted ? "PLAN_COMPLETION" : "TRAINING_DAY"}
          open={true}
          onClose={() => { setShareDialog(null); router.push("/feed"); router.refresh(); }}
          onPosted={() => { setShareDialog(null); router.push("/feed"); router.refresh(); }}
        />
      )}

      {/* Rest countdown */}
      {isResting && (
        <RestCountdown
          totalRestSeconds={currentExercise.restSeconds}
          onSkip={() => { skipRest(); stopRest(); }}
        />
      )}

      {/* Finish confirm */}
      {showFinishConfirm && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur px-6 gap-5">
          <Dumbbell className="h-12 w-12 text-primary" />
          <div className="text-center">
            <p className="text-xl font-bold">All exercises done!</p>
            <p className="text-sm text-muted-foreground mt-1">Great work. Ready to finish?</p>
          </div>
          <div className="flex flex-col gap-2 w-full max-w-xs">
            <Button onClick={handleFinish} disabled={isFinishing} className="w-full">
              {isFinishing ? "Saving..." : "Finish session"}
            </Button>
            <Button variant="outline" onClick={() => setShowFinishConfirm(false)} className="w-full">
              Keep going
            </Button>
          </div>
        </div>
      )}

      {/* Add exercise dialog */}
      <Dialog open={showAddExercise} onOpenChange={setShowAddExercise}>
        <DialogContent className="max-w-sm w-full max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add exercise</DialogTitle>
          </DialogHeader>
          <ExercisePicker
            addedIds={exercises.map((e) => e.exerciseId)}
            onAdd={handleAddExercise}
            onQuickCreate={handleQuickCreateExercise}
            creating={addingExercise}
          />
        </DialogContent>
      </Dialog>

      {/* Exercise info dialog */}
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="max-w-sm w-full">
          <DialogHeader>
            <DialogTitle>{currentExercise.exerciseName}</DialogTitle>
            <Badge variant="outline" className="w-fit text-xs mt-1">
              {currentExercise.muscleGroups.join(", ")}
            </Badge>
          </DialogHeader>
          <div className="space-y-4">
            {currentExercise.description ? (
              <p className="text-sm text-muted-foreground">{currentExercise.description}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No description available</p>
            )}
            {currentExercise.demoUrl && (() => {
              const ytId = extractYouTubeId(currentExercise.demoUrl);
              return ytId ? (
                <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
                  <iframe
                    src={`https://www.youtube.com/embed/${ytId}`}
                    title={currentExercise.exerciseName}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              ) : (
                <a href={currentExercise.demoUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                  View demo →
                </a>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">{planDayLabel ?? "Training"}</h1>
          <p className="text-xs text-muted-foreground">
            Exercise {currentExerciseIndex + 1} of {exercises.length}
            {skippedExerciseIds.length > 0 && ` · ${skippedExerciseIds.length} skipped`}
          </p>
        </div>
        <ElapsedTimer />
      </div>

      {/* Pause / Finish controls */}
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={handleTogglePause}>
          {isPaused ? (
            <><Play className="h-4 w-4 mr-1.5" /> Resume</>
          ) : (
            <><Pause className="h-4 w-4 mr-1.5" /> Pause</>
          )}
        </Button>
        <Button
          variant="outline"
          className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={() => setShowFinishConfirm(true)}
        >
          <Flag className="h-4 w-4 mr-1.5" /> Finish
        </Button>
      </div>

      <Separator />

      {/* Exercise navigation pills + Add button */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {exercises.map((ex, i) => {
          const isSkipped = skippedExerciseIds.includes(ex.exerciseId);
          const completedSets = setLogs.filter(
            (l) => l.exerciseId === ex.exerciseId && l.saved
          ).length;
          const done = !isSkipped && completedSets >= effectiveSets(ex);
          return (
            <button
              key={ex.exerciseId}
              type="button"
              onClick={() =>
                useTrainingSession.setState({
                  currentExerciseIndex: i,
                  currentSet: isSkipped ? 1 : Math.min(completedSets + 1, ex.sets),
                })
              }
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                i === currentExerciseIndex
                  ? "bg-primary text-primary-foreground"
                  : done
                  ? "bg-primary/20 text-primary"
                  : isSkipped
                  ? "bg-muted text-muted-foreground/40 line-through"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {ex.exerciseName.split(" ")[0]}
            </button>
          );
        })}
        {/* Add exercise pill */}
        <button
          type="button"
          onClick={() => setShowAddExercise(true)}
          className="shrink-0 rounded-full px-3 py-1 text-xs font-medium border border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary transition-colors"
        >
          + Add
        </button>
      </div>

      {/* Current exercise card */}
      <div className={cn(
        "rounded-xl border p-4 space-y-3",
        isCurrentSkipped && "opacity-60"
      )}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold">{currentExercise.exerciseName}</h2>
            <Badge variant="secondary" className="text-xs mt-0.5">
              {currentExercise.muscleGroups.join(", ")}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setInfoOpen(true)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Info className="h-4 w-4" />
            </button>
            <button
              onClick={isCurrentSkipped ? () => unskipExercise(currentExercise.exerciseId) : handleSkipExercise}
              className={cn(
                "flex items-center gap-1 text-xs font-medium transition-colors",
                isCurrentSkipped
                  ? "text-primary hover:text-primary/80"
                  : "text-muted-foreground hover:text-destructive"
              )}
            >
              <SkipForward className="h-3.5 w-3.5" />
              {isCurrentSkipped ? "Unskip" : "Skip"}
            </button>
          </div>
        </div>

        {!isCurrentSkipped && (
          <>
            <p className="text-sm text-muted-foreground">
              {effectiveSets(currentExercise)} sets × {currentExercise.reps} reps
            </p>

            {overloadHints.get(currentExercise.exerciseId) && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2">
                <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  {overloadHints.get(currentExercise.exerciseId)}
                </p>
              </div>
            )}

            <Separator />

            {/* All sets */}
            <div className="space-y-3">
              {Array.from({ length: effectiveSets(currentExercise) }, (_, i) => i + 1).map((setNum) => {
                const log = getSetLog(currentExercise.exerciseId, setNum);
                const isActive = setNum === currentSet;
                const isSaved = log?.saved ?? false;

                if (!isActive && !isSaved) return null;

                return (
                  <SetLogger
                    key={`${currentExercise.exerciseId}-${setNum}`}
                    sessionId={sessionId}
                    exerciseId={currentExercise.exerciseId}
                    setNumber={setNum}
                    totalSets={effectiveSets(currentExercise)}
                    defaultReps={currentExercise.reps}
                    savedWeight={log?.weightKg}
                    savedReps={log?.repsCompleted}
                    savedNotes={log?.notes}
                    onComplete={(w, r, n) => handleSetComplete(w, r, n, isSaved ? setNum : undefined)}
                    isSaved={isSaved}
                  />
                );
              })}
            </div>

            {/* Add / remove set buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => removeSet(currentExercise, effectiveSets(currentExercise))}
                disabled={effectiveSets(currentExercise) <= 1}
                className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-border py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Minus className="h-3 w-3" /> Remove set
              </button>
              <button
                onClick={() => addSet(currentExercise.exerciseId, effectiveSets(currentExercise))}
                className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-border py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                <Plus className="h-3 w-3" /> Add set
              </button>
            </div>

            {/* Sets progress dots */}
            <div className="flex gap-1.5 flex-wrap">
              {Array.from({ length: effectiveSets(currentExercise) }, (_, i) => i + 1).map((setNum) => {
                const log = getSetLog(currentExercise.exerciseId, setNum);
                return (
                  <div
                    key={setNum}
                    className={cn(
                      "h-2 flex-1 rounded-full min-w-[16px]",
                      log?.saved
                        ? "bg-primary"
                        : setNum === currentSet
                        ? "bg-primary/30"
                        : "bg-muted"
                    )}
                  />
                );
              })}
            </div>
          </>
        )}

        {isCurrentSkipped && (
          <p className="text-sm text-muted-foreground">
            This exercise is skipped. Tap &quot;Unskip&quot; to bring it back.
          </p>
        )}
      </div>

      {/* Exercise nav arrows */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          disabled={currentExerciseIndex === 0}
          onClick={() =>
            useTrainingSession.setState((s) => ({
              currentExerciseIndex: s.currentExerciseIndex - 1,
              currentSet: 1,
            }))
          }
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Prev
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          disabled={currentExerciseIndex >= exercises.length - 1}
          onClick={() =>
            useTrainingSession.setState((s) => ({
              currentExerciseIndex: s.currentExerciseIndex + 1,
              currentSet: 1,
            }))
          }
        >
          Next <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
