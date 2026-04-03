"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
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

interface Props {
  planId: string;
  planTitle: string;
}

export function UnenrollButton({ planId, planTitle }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleUnenroll() {
    setLoading(true);
    try {
      const res = await fetch(`/api/plans/${planId}/enroll`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Failed to unenroll");
        return;
      }
      toast.success(`Unenrolled from "${planTitle}"`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        disabled={loading}
        className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted transition-colors disabled:opacity-50"
      >
        <LogOut className="h-3.5 w-3.5" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unenroll from plan?</AlertDialogTitle>
          <AlertDialogDescription>
            You'll be removed from <span className="font-medium text-foreground">"{planTitle}"</span>.
            Your training history will be kept.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleUnenroll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Unenroll
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
