"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

export function FollowRequestActions({ followerId }: { followerId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"accept" | "reject" | null>(null);
  const [done, setDone] = useState(false);

  async function respond(action: "accept" | "reject") {
    setLoading(action);
    try {
      const res = await fetch("/api/follows", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followerId, action }),
      });
      if (!res.ok) { toast.error("Failed"); return; }
      toast.success(action === "accept" ? "Request accepted" : "Request rejected");
      setDone(true);
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  if (done) return <span className="text-xs text-muted-foreground">Done</span>;

  return (
    <div className="flex gap-2 shrink-0">
      <Button size="sm" className="h-8 px-3" onClick={() => respond("accept")} disabled={!!loading}>
        {loading === "accept" ? "..." : <><Check className="h-3.5 w-3.5 mr-1" /> Accept</>}
      </Button>
      <Button size="sm" variant="outline" className="h-8 px-3" onClick={() => respond("reject")} disabled={!!loading}>
        {loading === "reject" ? "..." : <><X className="h-3.5 w-3.5" /></>}
      </Button>
    </div>
  );
}
