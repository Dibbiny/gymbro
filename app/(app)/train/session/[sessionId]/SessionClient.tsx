"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTrainingSession, ExerciseEntry, PreloadedSetLog } from "@/store/trainingSession";
import { useTimerWorker } from "@/hooks/useTimerWorker";
import { ElapsedTimer } from "@/components/training/ElapsedTimer";
import { RestCountdown } from "@/components/training/RestCountdown";
import { SetLogger } from "@/components/training/SetLogger";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Pause, Play, Flag, ChevronLeft, ChevronRight, Dumbbell, Info } from "lucide-react";
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
}

export function SessionClient({ sessionId, exercises, planDayLabel, isRandomDay = false, preloadedLogs = [], pausedDuration = 0 }: Props) {
  const router = useRouter();
  const [isFinishing, setIsFinishing] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [shareDialog, setShareDialog] = useState<{
    sessionId: string;
    enrollmentId?: string;
    planCompleted: boolean;
  } | null>(null);

  const {
    initSession,
    resumeSession,
    currentExerciseIndex,
    currentSet,
    setLogs,
    isPaused,
    isResting,
    restSecondsLeft,
    elapsedSeconds,
    logSet,
    markSetSaved,
    advanceSet,
    startRest,
    stopRest,
    reset,
  } = useTrainingSession();

  const isResuming = pausedDuration > 0 || preloadedLogs.length > 0;
  const { pause, resume, startRest: workerStartRest, skipRest } = useTimerWorker(sessionId, pausedDuration);

  // Init store on mount
  useEffect(() => {
    if (isResuming) {
      resumeSession(sessionId, exercises, preloadedLogs, pausedDuration);
    } else {
      initSession(sessionId, exercises);
    }
    return () => reset();
  }, [sessionId]);

  const currentExercise = exercises[currentExerciseIndex];

  function getSetLog(exerciseId: string, setNumber: number) {
    return setLogs.find((l) => l.exerciseId === exerciseId && l.setNumber === setNumber);
  }

  async function handleSetComplete(weightKg: number | null, repsCompleted: number) {
    if (!currentExercise) return;

    // Optimistically mark in store
    logSet({
      exerciseId: currentExercise.exerciseId,
      setNumber: currentSet,
      weightKg,
      repsCompleted,
      saved: false,
    });

    // Save to API
    const res = await fetch(`/api/sessions/${sessionId}/sets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exerciseId: currentExercise.exerciseId,
        setNumber: currentSet,
        weightKg,
        repsCompleted,
      }),
    });

    if (res.ok) {
      markSetSaved(currentExercise.exerciseId, currentSet);
    } else {
      toast.error("Failed to save set — check your connection");
      return;
    }

    const isLastSetOfExercise = currentSet >= currentExercise.sets;
    const isLastExercise = currentExerciseIndex >= exercises.length - 1;

    if (isLastSetOfExercise && isLastExercise) {
      // Workout done — prompt finish
      setShowFinishConfirm(true);
      return;
    }

    // Start rest countdown
    startRest();
    workerStartRest(currentExercise.restSeconds);

    advanceSet();
  }

  function handleTogglePause() {
    if (isPaused) {
      resume();
    } else {
      pause();
      // Persist paused duration
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
        body: JSON.stringify({}),
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
      // Prompt to share
      setShareDialog({
        sessionId,
        enrollmentId: exercises[0] ? undefined : undefined, // enrollment not in scope here, handled via sessionId
        planCompleted: data.planCompleted,
      });
    } finally {
      setIsFinishing(false);
    }
  }

  if (!currentExercise) {
    return (
      <div className="text-center py-16 space-y-3">
        <Dumbbell className="h-10 w-10 mx-auto text-muted-foreground" />
        <p className="text-muted-foreground">No exercises in this session.</p>
        <Button variant="outline" onClick={() => router.push("/train")}>Back to Train</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Share dialog after completion */}
      {shareDialog && (
        <ShareWorkoutDialog
          sessionId={shareDialog.sessionId}
          postType={shareDialog.planCompleted ? "PLAN_COMPLETION" : "TRAINING_DAY"}
          open={true}
          onClose={() => { setShareDialog(null); router.push("/feed"); router.refresh(); }}
          onPosted={() => { setShareDialog(null); router.push("/feed"); router.refresh(); }}
        />
      )}

      {/* Rest countdown overlay */}
      {isResting && (
        <RestCountdown
          totalRestSeconds={currentExercise.restSeconds}
          onSkip={() => {
            skipRest();
            stopRest();
          }}
        />
      )}

      {/* Finish confirm overlay */}
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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">{planDayLabel ?? "Training"}</h1>
          <p className="text-xs text-muted-foreground">
            Exercise {currentExerciseIndex + 1} of {exercises.length}
          </p>
        </div>
        <ElapsedTimer />
      </div>

      {/* Pause / Finish controls */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleTogglePause}
        >
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

      {/* Exercise navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {exercises.map((ex, i) => {
          const completedSets = setLogs.filter(
            (l) => l.exerciseId === ex.exerciseId && l.saved
          ).length;
          const done = completedSets >= ex.sets;
          return (
            <button
              key={ex.exerciseId}
              type="button"
              onClick={() =>
                useTrainingSession.setState({
                  currentExerciseIndex: i,
                  currentSet: Math.min(completedSets + 1, ex.sets),
                })
              }
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                i === currentExerciseIndex
                  ? "bg-primary text-primary-foreground"
                  : done
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {ex.exerciseName.split(" ")[0]}
            </button>
          );
        })}
      </div>

      {/* Exercise info dialog */}
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="max-w-sm w-full">
          <DialogHeader>
            <DialogTitle>{currentExercise.exerciseName}</DialogTitle>
            <Badge variant="outline" className="w-fit text-xs mt-1">
              {currentExercise.categories.join(", ")}
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

      {/* Current exercise card */}
      <div className="rounded-xl border p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold">{currentExercise.exerciseName}</h2>
            <Badge variant="secondary" className="text-xs mt-0.5">
              {currentExercise.categories.join(", ")}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setInfoOpen(true)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Info className="h-4 w-4" />
            </button>
            <span className="text-sm text-muted-foreground">
              {currentExercise.sets} sets × {currentExercise.reps} reps
            </span>
          </div>
        </div>

        <Separator />

        {/* All sets for current exercise */}
        <div className="space-y-3">
          {Array.from({ length: currentExercise.sets }, (_, i) => i + 1).map((setNum) => {
            const log = getSetLog(currentExercise.exerciseId, setNum);
            const isActive = setNum === currentSet;
            const isSaved = log?.saved ?? false;

            if (!isActive && !isSaved) return null;

            return (
              <SetLogger
                key={setNum}
                sessionId={sessionId}
                exerciseId={currentExercise.exerciseId}
                exerciseName={currentExercise.exerciseName}
                setNumber={setNum}
                totalSets={currentExercise.sets}
                defaultReps={currentExercise.reps}
                onComplete={handleSetComplete}
                isSaved={isSaved}
              />
            );
          })}
        </div>

        {/* Sets progress summary */}
        <div className="flex gap-1.5 flex-wrap">
          {Array.from({ length: currentExercise.sets }, (_, i) => i + 1).map((setNum) => {
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
