"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const GOALS = [
  "Build muscle",
  "Lose weight",
  "Improve strength",
  "Improve endurance",
  "General fitness",
  "Athletic performance",
];

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
] as const;

interface Props {
  onGenerated: (planData: any) => void;
}

export function AIPlanGenerator({ onGenerated }: Props) {
  const [daysPerWeek, setDaysPerWeek] = useState<number>(3);
  const [age, setAge] = useState<string>("");
  const [weightKg, setWeightKg] = useState<string>("");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");
  const [goals, setGoals] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    if (!age || !weightKg || !goals) {
      toast.error("Please fill in age, weight, and goals");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          daysPerWeek,
          age: parseInt(age),
          weightKg: parseFloat(weightKg),
          gender,
          goals,
          notes: notes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Generation failed");
        return;
      }

      toast.success("Plan generated! Review and edit below.");
      onGenerated(json.plan);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <p className="text-sm text-muted-foreground">
          Tell us about yourself and AI will build a personalised plan.
        </p>
      </div>

      {/* Days per week */}
      <div className="space-y-2">
        <Label>Training days per week</Label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDaysPerWeek(d)}
              className={cn(
                "h-9 w-9 rounded-full text-sm font-medium transition-colors",
                daysPerWeek === d
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Age + Weight */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="age">Age</Label>
          <Input
            id="age"
            type="number"
            min={10}
            max={100}
            placeholder="e.g. 25"
            value={age}
            onChange={(e) => setAge(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="weight">Weight (kg)</Label>
          <Input
            id="weight"
            type="number"
            min={20}
            max={300}
            step={0.5}
            placeholder="e.g. 75"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
          />
        </div>
      </div>

      {/* Gender */}
      <div className="space-y-2">
        <Label>Gender</Label>
        <div className="flex gap-2">
          {GENDERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setGender(value)}
              className={cn(
                "flex-1 rounded-lg border py-2 text-sm font-medium transition-colors",
                gender === value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-muted"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Goals */}
      <div className="space-y-2">
        <Label>Goals</Label>
        <div className="flex flex-wrap gap-2">
          {GOALS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGoals(g)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                goals === g
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-muted"
              )}
            >
              {g}
            </button>
          ))}
        </div>
        <Input
          placeholder="Or describe your own goal..."
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
        />
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="ai-notes">Additional notes (optional)</Label>
        <textarea
          id="ai-notes"
          rows={2}
          placeholder="e.g. I have a bad knee, prefer dumbbell-only exercises, beginner level..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
        />
      </div>

      <Button className="w-full" onClick={handleGenerate} disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generating your plan...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Plan
          </>
        )}
      </Button>

      {loading && (
        <p className="text-xs text-center text-muted-foreground">
          This may take 10–20 seconds. AI is building your personalised plan.
        </p>
      )}
    </div>
  );
}
