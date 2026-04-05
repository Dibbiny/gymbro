"use client";

import { useEffect, useRef, useCallback } from "react";
import { useTrainingSession } from "@/store/trainingSession";

type WorkerOutMessage =
  | { type: "elapsed_tick"; seconds: number }
  | { type: "rest_tick"; seconds: number }
  | { type: "rest_done" }
  | { type: "paused" }
  | { type: "resumed" };

export function useTimerWorker(sessionId: string | null, elapsedOffset = 0) {
  const workerRef = useRef<Worker | null>(null);
  const { setElapsed, setPaused, tickRest, stopRest, isResting } = useTrainingSession();

  useEffect(() => {
    if (!sessionId) return;

    const worker = new Worker(
      new URL("../workers/timer.worker.ts", import.meta.url)
    );

    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
      const msg = event.data;
      switch (msg.type) {
        case "elapsed_tick":
          setElapsed(msg.seconds);
          break;
        case "rest_tick":
          useTrainingSession.setState({ restSecondsLeft: msg.seconds });
          break;
        case "rest_done":
          stopRest();
          break;
        case "paused":
          setPaused(true);
          break;
        case "resumed":
          setPaused(false);
          break;
      }
    };

    worker.postMessage({ type: "start", elapsedOffset });

    // When returning from background, force an immediate sync tick so
    // the UI snaps to the correct time without waiting for the next interval.
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        worker.postMessage({ type: "sync" });
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      worker.postMessage({ type: "terminate" });
      worker.terminate();
      workerRef.current = null;
    };
  }, [sessionId]);

  const pause = useCallback(() => {
    workerRef.current?.postMessage({ type: "pause" });
  }, []);

  const resume = useCallback(() => {
    workerRef.current?.postMessage({ type: "resume" });
  }, []);

  const startRest = useCallback((seconds: number) => {
    workerRef.current?.postMessage({ type: "start_rest", seconds });
  }, []);

  const skipRest = useCallback(() => {
    workerRef.current?.postMessage({ type: "stop_rest" });
    stopRest();
  }, [stopRest]);

  return { pause, resume, startRest, skipRest };
}
