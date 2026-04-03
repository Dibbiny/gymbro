"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

export function ExerciseApprovalActions({ exerciseId, adminId }: { exerciseId: string; adminId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [done, setDone] = useState(false);

  async function handle(action: "approve" | "reject") {
    setLoading(action);
    try {
      const res = await fetch(`/api/admin/exercises/${exerciseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, adminId }),
      });
      if (!res.ok) { toast.error("Failed"); return; }
      toast.success(action === "approve" ? "Exercise approved" : "Exercise rejected");
      setDone(true);
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  if (done) return <span className="text-xs text-muted-foreground">Done</span>;

  return (
    <div className="flex gap-2 shrink-0">
      <Button size="sm" className="h-8 px-3" onClick={() => handle("approve")} disabled={!!loading}>
        {loading === "approve" ? "..." : <><Check className="h-3.5 w-3.5 mr-1" /> Approve</>}
      </Button>
      <Button size="sm" variant="outline" className="h-8 px-3" onClick={() => handle("reject")} disabled={!!loading}>
        {loading === "reject" ? "..." : <X className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}
