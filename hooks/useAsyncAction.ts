"use client";

import { useState, useCallback, useRef } from "react";

/**
 * Wraps an async function so it can only run one invocation at a time.
 * Returns [run, isPending].
 *
 * Usage:
 *   const [handleSubmit, isPending] = useAsyncAction(async () => {
 *     await fetch(...)
 *   });
 *   <button onClick={handleSubmit} disabled={isPending}>...</button>
 */
export function useAsyncAction<T extends unknown[]>(
  fn: (...args: T) => Promise<void>
): [(...args: T) => void, boolean] {
  const [isPending, setIsPending] = useState(false);
  const pendingRef = useRef(false);

  const run = useCallback(
    (...args: T) => {
      if (pendingRef.current) return;
      pendingRef.current = true;
      setIsPending(true);
      fn(...args).finally(() => {
        pendingRef.current = false;
        setIsPending(false);
      });
    },
    [fn]
  );

  return [run, isPending];
}
