"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const MOVEMENT_TYPES = ["PULL", "PUSH", "CORE"] as const;
const MUSCLE_GROUPS = ["CHEST", "BACK", "SHOULDERS", "ARMS", "LEGS", "CORE"] as const;

interface Exercise {
  id: string;
  name: string;
  description: string | null;
  demoUrl: string | null;
  movementTypes: string[];
  muscleGroups: string[];
}

interface Props {
  exercise: Exercise;
}

export function ExerciseAdminActions({ exercise }: Props) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [name, setName] = useState(exercise.name);
  const [description, setDescription] = useState(exercise.description ?? "");
  const [demoUrl, setDemoUrl] = useState(exercise.demoUrl ?? "");
  const [selectedMovementTypes, setSelectedMovementTypes] = useState<string[]>(
    exercise.movementTypes
  );
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState<string[]>(
    exercise.muscleGroups
  );

  function toggleMovementType(type: string) {
    setSelectedMovementTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  function toggleMuscleGroup(group: string) {
    setSelectedMuscleGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/exercises/${exercise.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, demoUrl, movementTypes: selectedMovementTypes, muscleGroups: selectedMuscleGroups }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to save"); return; }
      toast.success("Exercise updated");
      setEditOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/exercises/${exercise.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to delete"); return; }
      toast.success("Exercise deleted");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center gap-1 shrink-0">
      {/* Edit */}
      <button
        onClick={() => setEditOpen(true)}
        className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>

      {/* Delete */}
      <AlertDialog>
        <AlertDialogTrigger
          disabled={deleting}
          className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted transition-colors disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{exercise.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Exercises used in plans or training history cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle>Edit exercise</SheetTitle>
          </SheetHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Demo URL <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input type="url" value={demoUrl} onChange={(e) => setDemoUrl(e.target.value)} placeholder="https://youtube.com/..." />
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
            </div>

            <div className="space-y-2">
              <Label>Muscle Group</Label>
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
            </div>

            <Button
              className="w-full"
              onClick={handleSave}
              disabled={saving || !name.trim() || selectedMovementTypes.length === 0 || selectedMuscleGroups.length === 0}
            >
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
