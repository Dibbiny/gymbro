"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
}

const schema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  demoUrl: z.string().url("Must be a valid URL").max(500).optional().or(z.literal("")),
  categoryIds: z.array(z.string()).min(1, "Select at least one category"),
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []));
  }, []);

  function toggleCategory(id: string) {
    setSelectedCategoryIds((prev) => {
      const next = prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id];
      setValue("categoryIds", next);
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
    setSelectedCategoryIds([]);
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
        <Label>Categories</Label>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => toggleCategory(cat.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                selectedCategoryIds.includes(cat.id)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
        {errors.categoryIds && <p className="text-xs text-destructive">{errors.categoryIds.message}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting
          ? "Submitting..."
          : autoApprove ? "Add exercise" : "Submit for approval"}
      </Button>
    </form>
  );
}
