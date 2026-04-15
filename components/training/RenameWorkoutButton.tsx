"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAsyncAction } from "@/hooks/useAsyncAction";

interface Props {
  sessionId: string;
  currentName: string;
}

export function RenameWorkoutButton({ sessionId, currentName }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const [handleSave, saving] = useAsyncAction(async () => {
    const trimmed = value.trim();
    if (trimmed === currentName) { setEditing(false); return; }
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workoutName: trimmed }),
    });
    if (!res.ok) { toast.error("Failed to rename workout"); return; }
    setEditing(false);
    router.refresh();
  });

  function handleCancel() {
    setValue(currentName);
    setEditing(false);
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-muted-foreground hover:text-foreground transition-colors"
        title="Rename workout"
      >
        <Pencil className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 flex-1 min-w-0">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") handleCancel(); }}
        maxLength={60}
        placeholder="Custom Workout"
        className="flex-1 min-w-0 h-8 rounded-lg border border-input bg-background px-2.5 text-sm font-bold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        disabled={saving}
      />
      <button onClick={handleSave} disabled={saving} className="text-primary hover:opacity-80 transition-opacity shrink-0">
        <Check className="h-4 w-4" />
      </button>
      <button onClick={handleCancel} disabled={saving} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
