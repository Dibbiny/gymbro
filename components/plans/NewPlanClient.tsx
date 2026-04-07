"use client";

import { useState } from "react";
import { PlanBuilder } from "@/components/plans/PlanBuilder";
import { AIPlanGenerator } from "@/components/plans/AIPlanGenerator";
import { Sparkles, PenLine, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type View = "choice" | "manual" | "ai-form" | "ai-review";

export function NewPlanClient() {
  const [view, setView] = useState<View>("choice");
  const [aiPlanData, setAiPlanData] = useState<any>(null);

  if (view === "manual") {
    return <PlanBuilder />;
  }

  if (view === "ai-form") {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setView("choice")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <AIPlanGenerator
          onGenerated={(data) => {
            setAiPlanData(data);
            setView("ai-review");
          }}
        />
      </div>
    );
  }

  if (view === "ai-review") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <p className="text-sm text-primary font-medium">
            AI-generated plan — review and edit before saving
          </p>
        </div>
        <PlanBuilder initialData={aiPlanData} />
      </div>
    );
  }

  // Default: choice screen
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">How do you want to create your plan?</p>
      <div className="grid grid-cols-1 gap-3">
        <button
          onClick={() => setView("ai-form")}
          className={cn(
            "flex items-start gap-4 rounded-xl border-2 border-primary/40 bg-primary/5 p-4 text-left transition-colors hover:border-primary hover:bg-primary/10"
          )}
        >
          <Sparkles className="h-6 w-6 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Generate with AI</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Tell Gemini your goals, age, and training days — it will build a personalised plan for you.
            </p>
          </div>
        </button>

        <button
          onClick={() => setView("manual")}
          className="flex items-start gap-4 rounded-xl border-2 border-border p-4 text-left transition-colors hover:border-foreground/30 hover:bg-muted"
        >
          <PenLine className="h-6 w-6 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Build manually</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Choose your own exercises, sets, reps, and schedule from scratch.
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
