// Web Worker: manages two independent timers
// 1. Elapsed session timer (counts up, survives tab backgrounding)
// 2. Rest countdown timer (counts down to zero)

type WorkerMessage =
  | { type: "start"; elapsedOffset: number }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "start_rest"; seconds: number }
  | { type: "stop_rest" }
  | { type: "terminate" };

let elapsedInterval: ReturnType<typeof setInterval> | null = null;
let restInterval: ReturnType<typeof setInterval> | null = null;
let elapsedSeconds = 0;
let restSecondsLeft = 0;
let isPaused = false;

function clearElapsed() {
  if (elapsedInterval !== null) {
    clearInterval(elapsedInterval);
    elapsedInterval = null;
  }
}

function clearRest() {
  if (restInterval !== null) {
    clearInterval(restInterval);
    restInterval = null;
  }
}

function startElapsedTimer() {
  clearElapsed();
  elapsedInterval = setInterval(() => {
    if (!isPaused) {
      elapsedSeconds++;
      self.postMessage({ type: "elapsed_tick", seconds: elapsedSeconds });
    }
  }, 1000);
}

function startRestTimer() {
  clearRest();
  restInterval = setInterval(() => {
    if (!isPaused) {
      restSecondsLeft--;
      self.postMessage({ type: "rest_tick", seconds: restSecondsLeft });
      if (restSecondsLeft <= 0) {
        clearRest();
        self.postMessage({ type: "rest_done" });
      }
    }
  }, 1000);
}

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const msg = event.data;

  switch (msg.type) {
    case "start":
      elapsedSeconds = msg.elapsedOffset ?? 0;
      isPaused = false;
      startElapsedTimer();
      break;

    case "pause":
      isPaused = true;
      self.postMessage({ type: "paused" });
      break;

    case "resume":
      isPaused = false;
      self.postMessage({ type: "resumed" });
      break;

    case "start_rest":
      restSecondsLeft = msg.seconds;
      startRestTimer();
      self.postMessage({ type: "rest_tick", seconds: restSecondsLeft });
      break;

    case "stop_rest":
      clearRest();
      restSecondsLeft = 0;
      break;

    case "terminate":
      clearElapsed();
      clearRest();
      self.close();
      break;
  }
};
