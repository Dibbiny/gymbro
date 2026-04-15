"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const MOVEMENT_TYPES = ["PULL", "PUSH", "CORE"] as const;
const MUSCLE_GROUPS = ["CHEST", "BACK", "SHOULDERS", "ARMS", "LEGS", "CORE"] as const;

const schema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  demoUrl: z.string().url("Must be a valid URL").max(500).optional().or(z.literal("")),
  movementTypes: z.array(z.enum(["PULL", "PUSH", "CORE"])).min(1, "Select at least one movement type"),
  muscleGroups: z.array(z.enum(["LEGS", "BACK", "ARMS", "CHEST", "SHOULDERS", "CORE"])).min(1, "Select at least one muscle group"),
});

type FormData = z.infer<typeof schema>;

interface Props {
  /** When true, admin bypass: exercise is auto-approved */
  autoApprove?: boolean;
  onSuccess?: () => void;
  redirectOnSuccess?: string;
}

export function ExerciseSubmitForm({ autoApprove, onSuccess, redirectOnSuccess }: Props) {
  const router = useRouter();
  const [selectedMovementTypes, setSelectedMovementTypes] = useState<string[]>([]);
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  function toggleMovementType(type: string) {
    setSelectedMovementTypes((prev) => {
      const next = prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type];
      setValue("movementTypes", next as any);
      return next;
    });
  }

  function toggleMuscleGroup(group: string) {
    setSelectedMuscleGroups((prev) => {
      const next = prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group];
      setValue("muscleGroups", next as any);
      return next;
    });
  }

  async function onSubmit(data: FormData) {
    const res = await fetch("/api/exercises", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        demoUrl: data.demoUrl || undefined,
        autoApprove: autoApprove ?? false,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "Failed to submit exercise");
      return;
    }
    toast.success(autoApprove ? "Exercise added!" : "Exercise submitted for approval!");
    reset();
    setSelectedMovementTypes([]);
    setSelectedMuscleGroups([]);
    onSuccess?.();
    if (redirectOnSuccess) router.push(redirectOnSuccess);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="ex-name">Exercise name</Label>
        <Input id="ex-name" placeholder="e.g. Romanian Deadlift" {...register("name")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ex-desc">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <textarea
          id="ex-desc"
          rows={2}
          placeholder="Brief description of the exercise..."
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          {...register("description")}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ex-demo">Demo URL <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Input id="ex-demo" type="url" placeholder="https://youtube.com/..." {...register("demoUrl")} />
        {errors.demoUrl && <p className="text-xs text-destructive">{errors.demoUrl.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Movement Type</Label>
        <div className="flex flex-wrap gap-2">
          {MOVEMENT_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => toggleMovementType(type)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                selectedMovementTypes.includes(type)
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-foreground hover:bg-muted"
              )}
            >
              {type}
            </button>
          ))}
        </div>
        {errors.movementTypes && <p className="text-xs text-destructive">{errors.movementTypes.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Primary Muscle Group</Label>
        <div className="flex flex-wrap gap-2">
          {MUSCLE_GROUPS.map((group) => (
            <button
              key={group}
              type="button"
              onClick={() => toggleMuscleGroup(group)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                selectedMuscleGroups.includes(group)
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-foreground hover:bg-muted"
              )}
            >
              {group}
            </button>
          ))}
        </div>
        {errors.muscleGroups && <p className="text-xs text-destructive">{errors.muscleGroups.message}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting
          ? "Submitting..."
          : autoApprove ? "Add exercise" : "Submit for approval"}
      </Button>
    </form>
  );
}
