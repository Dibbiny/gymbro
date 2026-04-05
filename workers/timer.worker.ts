// Web Worker: timestamp-based timers that survive iOS Safari backgrounding.
// Instead of incrementing counters each tick, we store wall-clock start times
// and compute values as (Date.now() - startedAt). This means even if the
// interval is throttled or suspended, the correct value is shown on the
// next tick when the app returns to the foreground.

type WorkerMessage =
  | { type: "start"; elapsedOffset: number }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "start_rest"; seconds: number }
  | { type: "stop_rest" }
  | { type: "sync" }       // called on visibilitychange to force immediate tick
  | { type: "terminate" };

let elapsedInterval: ReturnType<typeof setInterval> | null = null;
let restInterval: ReturnType<typeof setInterval> | null = null;

// Wall-clock start time adjusted for any elapsed offset and accumulated paused time
let elapsedStartedAt: number = 0;   // Date.now() - elapsedOffset*1000
let pausedAt: number | null = null; // Date.now() when last paused
let isPaused = false;

let restEndsAt: number = 0;         // Date.now() + restSeconds*1000

function clearElapsed() {
  if (elapsedInterval !== null) { clearInterval(elapsedInterval); elapsedInterval = null; }
}
function clearRest() {
  if (restInterval !== null) { clearInterval(restInterval); restInterval = null; }
}

function tickElapsed() {
  if (isPaused) return;
  const seconds = Math.floor((Date.now() - elapsedStartedAt) / 1000);
  self.postMessage({ type: "elapsed_tick", seconds });
}

function tickRest() {
  if (isPaused) return;
  const left = Math.ceil((restEndsAt - Date.now()) / 1000);
  if (left <= 0) {
    clearRest();
    self.postMessage({ type: "rest_tick", seconds: 0 });
    self.postMessage({ type: "rest_done" });
  } else {
    self.postMessage({ type: "rest_tick", seconds: left });
  }
}

function startElapsedTimer() {
  clearElapsed();
  elapsedInterval = setInterval(tickElapsed, 1000);
}

function startRestTimer() {
  clearRest();
  restInterval = setInterval(tickRest, 1000);
}

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const msg = event.data;

  switch (msg.type) {
    case "start":
      isPaused = false;
      pausedAt = null;
      elapsedStartedAt = Date.now() - (msg.elapsedOffset ?? 0) * 1000;
      startElapsedTimer();
      tickElapsed();
      break;

    case "pause":
      if (!isPaused) {
        isPaused = true;
        pausedAt = Date.now();
        self.postMessage({ type: "paused" });
      }
      break;

    case "resume":
      if (isPaused && pausedAt !== null) {
        // Shift the start time forward by however long we were paused
        const pausedFor = Date.now() - pausedAt;
        elapsedStartedAt += pausedFor;
        if (restEndsAt > 0) restEndsAt += pausedFor;
        isPaused = false;
        pausedAt = null;
        self.postMessage({ type: "resumed" });
        tickElapsed();
      }
      break;

    case "start_rest":
      restEndsAt = Date.now() + msg.seconds * 1000;
      startRestTimer();
      tickRest();
      break;

    case "stop_rest":
      clearRest();
      restEndsAt = 0;
      break;

    case "sync":
      // Called when app returns to foreground — fire ticks immediately
      tickElapsed();
      if (restEndsAt > 0 && restInterval !== null) tickRest();
      break;

    case "terminate":
      clearElapsed();
      clearRest();
      self.close();
      break;
  }
};
