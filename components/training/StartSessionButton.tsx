"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

interface Props {
  enrollmentId: string;
  planDayId: string;
  compact?: boolean;
}

export function StartSessionButton({ enrollmentId, planDayId, compact }: Props) {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);

  async function handleStart() {
    setIsStarting(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentId, planDayId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to start session");
        return;
      }
      router.push(`/train/session/${data.session.id}`);
    } finally {
      setIsStarting(false);
    }
  }

  if (compact) {
    return (
      <Button size="sm" className="h-8 px-3 shrink-0" onClick={handleStart} disabled={isStarting}>
        <Play className="h-3.5 w-3.5 mr-1" />
        {isStarting ? "..." : "Start"}
      </Button>
    );
  }

  return (
    <Button className="w-full" onClick={handleStart} disabled={isStarting}>
      <Play className="h-4 w-4 mr-1.5" />
      {isStarting ? "Starting..." : "Start today's workout"}
    </Button>
  );
}
