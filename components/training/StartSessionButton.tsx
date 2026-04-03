"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

interface Props {
  enrollmentId: string;
  planDayId: string;
}

export function StartSessionButton({ enrollmentId, planDayId }: Props) {
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

  return (
    <Button className="w-full" onClick={handleStart} disabled={isStarting}>
      <Play className="h-4 w-4 mr-1.5" />
      {isStarting ? "Starting..." : "Start today's workout"}
    </Button>
  );
}
