"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

export function AnnouncementToggle({ announcementId, isActive }: { announcementId: string; isActive: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/announcements/${announcementId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (!res.ok) { toast.error("Failed"); return; }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="sm" variant="outline" className="h-8 px-2.5 shrink-0" onClick={toggle} disabled={loading}>
      {isActive ? <><EyeOff className="h-3.5 w-3.5 mr-1" /> Hide</> : <><Eye className="h-3.5 w-3.5 mr-1" /> Show</>}
    </Button>
  );
}
