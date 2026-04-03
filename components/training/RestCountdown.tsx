"use client";

import { useTrainingSession } from "@/store/trainingSession";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SkipForward } from "lucide-react";

interface RestCountdownProps {
  totalRestSeconds: number;
  onSkip: () => void;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function RestCountdown({ totalRestSeconds, onSkip }: RestCountdownProps) {
  const { restSecondsLeft } = useTrainingSession();

  const pct = totalRestSeconds > 0
    ? Math.max(0, Math.round((restSecondsLeft / totalRestSeconds) * 100))
    : 0;

  const m = Math.floor(restSecondsLeft / 60);
  const s = restSecondsLeft % 60;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur px-6 gap-6">
      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Rest</p>
      <span className="text-7xl font-mono font-bold tabular-nums">
        {pad(m)}:{pad(s)}
      </span>
      <Progress value={pct} className="w-full max-w-xs h-2" />
      <Button variant="outline" size="sm" onClick={onSkip}>
        <SkipForward className="h-4 w-4 mr-1" /> Skip rest
      </Button>
    </div>
  );
}
