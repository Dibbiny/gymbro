"use client";

export default function PlansError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center space-y-3">
      <p className="font-semibold text-destructive">Failed to load plans</p>
      <button
        onClick={reset}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
