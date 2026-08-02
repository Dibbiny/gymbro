"use client";

import { useState } from "react";
import { Sparkles, TrendingUp, Trophy, Lightbulb, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SummaryData {
  headline: string;
  overview: string;
  highlight: string;
  tip: string;
}

interface Meta {
  sessions: number;
  totalSets: number;
  totalVolume: number;
  volumeDelta: number | null;
  topMuscle: string | null;
  weekStart: string;
  weekEnd: string;
}

export function WeeklySummary() {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error" | "no-data">("idle");
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  async function generate() {
    setState("loading");
    setSummary(null);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/weekly-summary");
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? "Something went wrong");
        setState("error");
        return;
      }

      if (!data.summary) {
        setState("no-data");
        return;
      }

      setSummary(data.summary);
      setMeta(data.meta);
      setState("done");
    } catch {
      setErrorMsg("Failed to reach the server");
      setState("error");
    }
  }

  const formatVolume = (kg: number) =>
    kg >= 1000 ? `${(kg / 1000).toFixed(1)}t` : `${kg.toLocaleString()} kg`;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div className="rounded-xl border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/40">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">AI Weekly Recap</span>
          {meta && (
            <span className="text-xs text-muted-foreground">
              {formatDate(meta.weekStart)} – {formatDate(meta.weekEnd)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {state === "done" && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="rounded-md p-1 hover:bg-muted transition-colors"
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          )}
          <button
            onClick={generate}
            disabled={state === "loading"}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 h-7 text-xs font-medium transition-colors",
              state === "loading"
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {state === "loading" ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Generating…
              </>
            ) : state === "done" ? (
              <>
                <Sparkles className="h-3 w-3" />
                Regenerate
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3" />
                Generate
              </>
            )}
          </button>
        </div>
      </div>

      {/* Idle state */}
      {state === "idle" && (
        <div className="px-4 py-6 text-center space-y-1">
          <p className="text-sm text-muted-foreground">
            Get a personalised AI recap of your last week of training.
          </p>
          <p className="text-xs text-muted-foreground/70">
            Covers volume, best lifts, and a coaching tip for next week.
          </p>
        </div>
      )}

      {/* Loading state */}
      {state === "loading" && (
        <div className="px-4 py-8 flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <p className="text-sm">Analysing last week…</p>
        </div>
      )}

      {/* No data */}
      {state === "no-data" && (
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            No sessions found for last week. Complete some workouts and check back!
          </p>
        </div>
      )}

      {/* Error */}
      {state === "error" && (
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-destructive">{errorMsg}</p>
        </div>
      )}

      {/* Done */}
      {state === "done" && summary && expanded && (
        <div className="divide-y divide-border">
          {/* Stats bar */}
          {meta && (
            <div className="grid grid-cols-3 divide-x divide-border">
              <div className="flex flex-col items-center py-3 gap-0.5">
                <span className="text-base font-bold tabular-nums">{meta.sessions}</span>
                <span className="text-xs text-muted-foreground">sessions</span>
              </div>
              <div className="flex flex-col items-center py-3 gap-0.5">
                <span className="text-base font-bold tabular-nums">{meta.totalSets}</span>
                <span className="text-xs text-muted-foreground">sets</span>
              </div>
              <div className="flex flex-col items-center py-3 gap-0.5">
                <span className="text-base font-bold tabular-nums">{formatVolume(meta.totalVolume)}</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  volume
                  {meta.volumeDelta !== null && (
                    <span
                      className={cn(
                        "text-xs font-medium",
                        meta.volumeDelta >= 0 ? "text-green-500" : "text-destructive"
                      )}
                    >
                      {meta.volumeDelta > 0 ? "+" : ""}
                      {meta.volumeDelta}%
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Headline */}
          <div className="px-4 py-3">
            <h3 className="text-sm font-bold">{summary.headline}</h3>
          </div>

          {/* Overview */}
          <div className="px-4 py-3 flex gap-3">
            <TrendingUp className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground leading-relaxed">{summary.overview}</p>
          </div>

          {/* Highlight */}
          <div className="px-4 py-3 flex gap-3">
            <Trophy className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
            <p className="text-sm leading-relaxed">{summary.highlight}</p>
          </div>

          {/* Tip */}
          <div className="px-4 py-3 flex gap-3 bg-muted/30">
            <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-sm leading-relaxed">
              <span className="font-medium">Next week: </span>
              {summary.tip}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
