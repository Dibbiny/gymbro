"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Shield, ShieldOff } from "lucide-react";

export function UserRoleToggle({ userId, currentRole }: { userId: string; currentRole: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isAdmin = currentRole === "ADMIN";

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: isAdmin ? "USER" : "ADMIN" }),
      });
      if (!res.ok) { toast.error("Failed to update role"); return; }
      toast.success(isAdmin ? "Admin removed" : "Made admin");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="sm" variant="outline" className="h-8 px-2.5 shrink-0" onClick={toggle} disabled={loading}>
      {isAdmin
        ? <><ShieldOff className="h-3.5 w-3.5 mr-1" /> Remove admin</>
        : <><Shield className="h-3.5 w-3.5 mr-1" /> Make admin</>}
    </Button>
  );
}
