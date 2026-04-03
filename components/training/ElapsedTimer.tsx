"use client";

import { useTrainingSession } from "@/store/trainingSession";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function ElapsedTimer() {
  const { elapsedSeconds, isPaused } = useTrainingSession();

  const h = Math.floor(elapsedSeconds / 3600);
  const m = Math.floor((elapsedSeconds % 3600) / 60);
  const s = elapsedSeconds % 60;

  return (
    <div className="text-center">
      <span className={`text-4xl font-mono font-bold tabular-nums tracking-tight ${isPaused ? "text-muted-foreground" : ""}`}>
        {h > 0 && <>{pad(h)}:</>}{pad(m)}:{pad(s)}
      </span>
      {isPaused && (
        <p className="text-xs text-muted-foreground mt-0.5">Paused</p>
      )}
    </div>
  );
}
