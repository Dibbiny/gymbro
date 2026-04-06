"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, ChevronLeft, ChevronRight, Check, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Category {
  id: string;
  name: string;
}

interface Exercise {
  id: string;
  name: string;
  categories: { name: string }[];
  status: string;
}

const exerciseEntrySchema = z.object({
  exerciseId: z.string().min(1, "Select an exercise"),
  orderIndex: z.number(),
  sets: z.number().int().min(1).max(100),
  reps: z.number().int().min(1).max(1000),
  restSeconds: z.number().int().min(0).max(600),
});

const planDaySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  weekNumber: z.number().int().min(1),
  label: z.string().max(50).optional(),
  exercises: z.array(exerciseEntrySchema),
});

const planSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().max(500).optional(),
  durationWeeks: z.number().int().min(1).max(52),
  visibility: z.enum(["PUBLIC", "PRIVATE"]),
  days: z.array(planDaySchema),
});

type PlanForm = z.infer<typeof planSchema>;

const STEPS = ["Details", "Training Days", "Review"];

interface Props {
  planId?: string;
  initialData?: PlanForm;
  redirectTo?: string;
}

export function PlanBuilder({ planId, initialData, redirectTo }: Props) {
  const router = useRouter();
  const isEditing = !!planId;
  const [step, setStep] = useState(0);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedDays, setSelectedDays] = useState<number[]>(
    initialData?.days.map((d) => d.dayOfWeek) ?? []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PlanForm>({
    resolver: zodResolver(planSchema),
    defaultValues: initialData ?? {
      title: "",
      description: "",
      durationWeeks: 4,
      visibility: "PRIVATE",
      days: [],
    },
  });

  const { fields: dayFields, replace: replaceDays } = useFieldArray({
    control: form.control,
    name: "days",
  });

  useEffect(() => {
    fetch("/api/exercises")
      .then((r) => r.json())
      .then((d) => setExercises(d.exercises ?? []));
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []));
  }, []);

  function toggleDay(dayIndex: number) {
    setSelectedDays((prev) => {
      const next = prev.includes(dayIndex)
        ? prev.filter((d) => d !== dayIndex)
        : [...prev, dayIndex].sort((a, b) => a - b);

      const currentDays = form.getValues("days");
      const updatedDays = next.map((d) => {
        const existing = currentDays.find((cd) => cd.dayOfWeek === d);
        return existing ?? { dayOfWeek: d, weekNumber: 1, label: "", exercises: [] };
      });
      replaceDays(updatedDays);
      return next;
    });
  }

  async function onSubmit(data: PlanForm) {
    setIsSubmitting(true);
    try {
      const url = isEditing ? `/api/plans/${planId}` : "/api/plans";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? (isEditing ? "Failed to update plan" : "Failed to create plan"));
        return;
      }
      toast.success(isEditing ? "Plan updated!" : "Plan created!");
      router.push(redirectTo ?? `/plans/${isEditing ? planId : json.plan.id}`);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                i < step
                  ? "bg-primary text-primary-foreground"
                  : i === step
                  ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span className={cn("text-sm", i === step ? "font-semibold" : "text-muted-foreground")}>
              {label}
            </span>
            {i < STEPS.length - 1 && <div className="h-px w-6 bg-border" />}
          </div>
        ))}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Step 1: Details */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Plan name</Label>
              <Input id="title" placeholder="e.g. Push Pull Legs 6-Day" {...form.register("title")} />
              {form.formState.errors.title && (
                <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description (optional)</Label>
              <textarea
                id="description"
                rows={3}
                placeholder="Describe your plan..."
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                {...form.register("description")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="durationWeeks">Duration (weeks)</Label>
              <Input
                id="durationWeeks"
                type="number"
                min={1}
                max={52}
                {...form.register("durationWeeks", { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <Label>Visibility</Label>
              <div className="flex gap-3">
                {(["PRIVATE", "PUBLIC"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => form.setValue("visibility", v)}
                    className={cn(
                      "flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors",
                      form.watch("visibility") === v
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:bg-muted"
                    )}
                  >
                    {v === "PRIVATE" ? "Private" : "Public"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Training Days */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Training days</Label>
              <div className="flex gap-2 flex-wrap">
                {DAY_NAMES.map((name, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={cn(
                      "h-10 w-10 rounded-full text-sm font-medium transition-colors",
                      selectedDays.includes(i)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {name}
                  </button>
                ))}
              </div>
              {selectedDays.length === 0 && (
                <p className="text-xs text-muted-foreground">Select at least one training day</p>
              )}
            </div>

            {dayFields.map((dayField, dayIdx) => (
              <DayEditor
                key={dayField.id}
                dayIdx={dayIdx}
                dayName={DAY_NAMES[dayField.dayOfWeek]}
                form={form}
                exercises={exercises}
                categories={categories}
              />
            ))}
          </div>
        )}

        {/* Step 3: Review */}
        {step === 2 && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{form.watch("title")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {form.watch("description") && <p>{form.watch("description")}</p>}
                <p>{form.watch("durationWeeks")} weeks · {form.watch("visibility") === "PUBLIC" ? "Public" : "Private"}</p>
                <p>{selectedDays.length} training day{selectedDays.length !== 1 ? "s" : ""}: {selectedDays.map((d) => DAY_NAMES[d]).join(", ")}</p>
                <p>{form.watch("days").reduce((sum, d) => sum + d.exercises.length, 0)} exercises total</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          {step > 0 && (
            <Button type="button" variant="outline" className="flex-1" onClick={() => setStep((s) => s - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button
              type="button"
              className="flex-1"
              onClick={async () => {
                if (step === 0) {
                  const valid = await form.trigger(["title", "durationWeeks", "visibility"]);
                  if (!valid) return;
                }
                if (step === 1 && selectedDays.length === 0) {
                  toast.error("Select at least one training day");
                  return;
                }
                setStep((s) => s + 1);
              }}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting
                ? isEditing ? "Saving..." : "Creating..."
                : isEditing ? "Save changes" : "Create plan"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

function DayEditor({
  dayIdx,
  dayName,
  form,
  exercises,
  categories,
}: {
  dayIdx: number;
  dayName: string;
  form: UseFormReturn<PlanForm>;
  exercises: Exercise[];
  categories: Category[];
}) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: `days.${dayIdx}.exercises`,
  });

  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  const filtered =
    categoryFilter === "ALL"
      ? exercises
      : exercises.filter((e) => e.categories.some((c) => c.name === categoryFilter));

  function addExercise(ex: Exercise) {
    if (fields.some((f) => f.exerciseId === ex.id)) return;
    append({ exerciseId: ex.id, orderIndex: fields.length, sets: 3, reps: 10, restSeconds: 90 });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">{dayName}</CardTitle>
          <Badge variant="secondary" className="text-xs">{fields.length} exercise{fields.length !== 1 ? "s" : ""}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {["ALL", ...categories.map((c) => c.name)].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                categoryFilter === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {cat === "ALL" ? "All" : cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
          {filtered.map((ex) => {
            const added = fields.some((f) => f.exerciseId === ex.id);
            return (
              <button
                key={ex.id}
                type="button"
                onClick={() => addExercise(ex)}
                disabled={added}
                className={cn(
                  "rounded-lg border px-2 py-1.5 text-left text-xs transition-colors",
                  added
                    ? "border-primary/30 bg-primary/10 text-primary cursor-default"
                    : "border-border hover:bg-muted"
                )}
              >
                <div className="font-medium truncate">{ex.name}</div>
                <div className="text-muted-foreground">{ex.categories.map((c) => c.name).join(", ")}</div>
              </button>
            );
          })}
        </div>

        {fields.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              {fields.map((field, exIdx) => {
                const ex = exercises.find((e) => e.id === field.exerciseId);
                return (
                  <div key={field.id} className="rounded-lg bg-muted/50 p-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Dumbbell className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium truncate max-w-[140px]">
                          {ex?.name ?? "Unknown"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(exIdx)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Sets</label>
                        <Input
                          type="number"
                          min={1}
                          className="h-7 text-xs"
                          {...form.register(`days.${dayIdx}.exercises.${exIdx}.sets`, { valueAsNumber: true })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Reps</label>
                        <Input
                          type="number"
                          min={1}
                          className="h-7 text-xs"
                          {...form.register(`days.${dayIdx}.exercises.${exIdx}.reps`, { valueAsNumber: true })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Rest (s)</label>
                        <Input
                          type="number"
                          min={0}
                          className="h-7 text-xs"
                          {...form.register(`days.${dayIdx}.exercises.${exIdx}.restSeconds`, { valueAsNumber: true })}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
