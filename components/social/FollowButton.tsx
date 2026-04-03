"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck, Clock } from "lucide-react";

interface Props {
  targetUserId: string;
  initialStatus: string | null; // null = not following, "PENDING", "ACCEPTED"
}

export function FollowButton({ targetUserId, initialStatus }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);

  async function handleFollow() {
    setLoading(true);
    try {
      if (status === "ACCEPTED") {
        // Unfollow
        const res = await fetch(`/api/follows?targetUserId=${targetUserId}`, { method: "DELETE" });
        if (res.ok) { setStatus(null); toast.success("Unfollowed"); }
        return;
      }
      if (status === "PENDING") {
        // Cancel request
        const res = await fetch(`/api/follows?targetUserId=${targetUserId}`, { method: "DELETE" });
        if (res.ok) { setStatus(null); toast.success("Request cancelled"); }
        return;
      }
      // Send request
      const res = await fetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });
      if (res.ok) {
        setStatus("PENDING");
        toast.success("Follow request sent");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  if (status === "ACCEPTED") {
    return (
      <Button size="sm" variant="outline" onClick={handleFollow} disabled={loading}>
        <UserCheck className="h-4 w-4 mr-1.5" /> Following
      </Button>
    );
  }
  if (status === "PENDING") {
    return (
      <Button size="sm" variant="outline" onClick={handleFollow} disabled={loading}>
        <Clock className="h-4 w-4 mr-1.5" /> Requested
      </Button>
    );
  }
  return (
    <Button size="sm" onClick={handleFollow} disabled={loading}>
      <UserPlus className="h-4 w-4 mr-1.5" /> Follow
    </Button>
  );
}
