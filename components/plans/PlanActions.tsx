"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StarRating } from "./StarRating";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CheckCircle2, PlusCircle, Copy } from "lucide-react";

interface Enrollment {
  id: string;
  isActive: boolean;
  startDate: Date;
}

interface PlanActionsProps {
  planId: string;
  isOwner: boolean;
  isPublic: boolean;
  enrollment: Enrollment | null;
  avgRating: number;
  ratingCount: number;
  myRating: number;
}

export function PlanActions({
  planId,
  isOwner,
  isPublic,
  enrollment,
  avgRating,
  ratingCount,
  myRating: initialMyRating,
}: PlanActionsProps) {
  const router = useRouter();
  const [myRating, setMyRating] = useState(initialMyRating);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);

  const isEnrolled = enrollment?.isActive;

  async function handleEnroll() {
    setIsEnrolling(true);
    try {
      const res = await fetch(`/api/plans/${planId}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: new Date(startDate).toISOString() }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to enroll"); return; }
      toast.success("Enrolled! Head to Train to get started.");
      setEnrollOpen(false);
      router.refresh();
    } finally {
      setIsEnrolling(false);
    }
  }

  async function handleUnenroll() {
    const res = await fetch(`/api/plans/${planId}/enroll`, { method: "DELETE" });
    if (!res.ok) { toast.error("Failed to unenroll"); return; }
    toast.success("Unenrolled from plan");
    router.refresh();
  }

  async function handleRate(rating: number) {
    if (isOwner) return;
    const prev = myRating;
    setMyRating(rating);
    const res = await fetch(`/api/plans/${planId}/rate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating }),
    });
    if (!res.ok) {
      setMyRating(prev);
      toast.error("Failed to save rating");
      return;
    }
    toast.success(`Rated ${rating} star${rating !== 1 ? "s" : ""}`);
    router.refresh();
  }

  async function handleClone() {
    setIsCloning(true);
    try {
      const res = await fetch(`/api/plans/${planId}/clone`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to clone"); return; }
      toast.success("Plan cloned to your private plans!");
      router.push(`/plans/${json.plan.id}`);
    } finally {
      setIsCloning(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Rating */}
      {!isOwner && (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <StarRating
              value={myRating || Math.round(avgRating)}
              onChange={handleRate}
              readonly={false}
            />
            <span className="text-xs text-muted-foreground">
              {avgRating > 0 ? `${avgRating} (${ratingCount})` : "No ratings"}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {myRating ? "Your rating" : "Tap to rate"}
          </p>
        </div>
      )}
      {isOwner && (
        <div className="flex items-center gap-1.5">
          <StarRating value={Math.round(avgRating)} readonly />
          <span className="text-xs text-muted-foreground">
            {avgRating > 0 ? `${avgRating} (${ratingCount})` : "No ratings yet"}
          </span>
        </div>
      )}

      {/* Enroll / unenroll + clone */}
      <div className="flex gap-2">
          {isEnrolled ? (
            <Button variant="outline" size="sm" onClick={handleUnenroll} className="flex-1">
              <CheckCircle2 className="h-4 w-4 mr-1 text-primary" />
              Enrolled
            </Button>
          ) : (
            <>
              <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
                <Button size="sm" onClick={() => setEnrollOpen(true)} className="flex-1">
                  <PlusCircle className="h-4 w-4 mr-1" />
                  Enroll
                </Button>
                <DialogContent className="max-w-xs">
                  <DialogHeader>
                    <DialogTitle>Start this plan</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="start-date">Start date (Week 1 begins on)</Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <Button className="w-full" onClick={handleEnroll} disabled={isEnrolling}>
                      {isEnrolling ? "Enrolling..." : "Start plan"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}

          {!isOwner && isPublic && (
            <Button variant="outline" size="sm" onClick={handleClone} disabled={isCloning}>
              <Copy className="h-4 w-4 mr-1" />
              {isCloning ? "Cloning..." : "Clone"}
            </Button>
          )}
        </div>
    </div>
  );
}
