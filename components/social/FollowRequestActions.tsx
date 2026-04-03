"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Check, X, UserPlus, Clock } from "lucide-react";

export function FollowRequestActions({ followerId }: { followerId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"accept" | "reject" | "followback" | null>(null);
  // "pending" = awaiting action, "accepted" = just accepted, "rejected" = rejected, "sent" = follow-back sent
  const [state, setState] = useState<"pending" | "accepted" | "rejected" | "sent">("pending");

  async function respond(action: "accept" | "reject") {
    setLoading(action);
    try {
      const res = await fetch("/api/follows", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followerId, action }),
      });
      if (!res.ok) { toast.error("Failed"); return; }
      setState(action === "accept" ? "accepted" : "rejected");
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function followBack() {
    setLoading("followback");
    try {
      const res = await fetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: followerId }),
      });
      if (!res.ok) { toast.error("Failed to send request"); return; }
      toast.success("Follow request sent");
      setState("sent");
    } finally {
      setLoading(null);
    }
  }

  if (state === "rejected") {
    return <span className="text-xs text-muted-foreground">Rejected</span>;
  }

  if (state === "sent") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" /> Requested
      </span>
    );
  }

  if (state === "accepted") {
    return (
      <Button size="sm" className="h-8 px-3" onClick={followBack} disabled={!!loading}>
        {loading === "followback"
          ? "..."
          : <><UserPlus className="h-3.5 w-3.5 mr-1" /> Follow back</>}
      </Button>
    );
  }

  return (
    <div className="flex gap-2 shrink-0">
      <Button size="sm" className="h-8 px-3" onClick={() => respond("accept")} disabled={!!loading}>
        {loading === "accept" ? "..." : <><Check className="h-3.5 w-3.5 mr-1" /> Accept</>}
      </Button>
      <Button size="sm" variant="outline" className="h-8 px-3" onClick={() => respond("reject")} disabled={!!loading}>
        {loading === "reject" ? "..." : <X className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}
