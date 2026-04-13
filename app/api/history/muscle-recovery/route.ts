import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// Estimated full-recovery window per muscle category (hours)
const RECOVERY_HOURS: Record<string, number> = {
  CHEST: 48,
  BACK: 48,
  LEGS: 72,
  SHOULDERS: 48,
  ARMS: 36,
  CORE: 24,
  OTHER: 48,
};

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // last 10 days

  const setLogs = await db.setLog.findMany({
    where: {
      session: {
        userId: session.user.id,
        completedAt: { not: null, gte: since },
      },
    },
    include: {
      exercise: {
        select: { muscleGroups: true },
      },
      session: {
        select: { completedAt: true },
      },
    },
    orderBy: { loggedAt: "desc" },
  });

  // Track most recent session completedAt per muscle group
  const lastTrainedByCategory: Record<string, Date> = {};

  for (const log of setLogs) {
    const completedAt = log.session.completedAt;
    if (!completedAt) continue;

    for (const key of log.exercise.muscleGroups) {
      const existing = lastTrainedByCategory[key];
      if (!existing || completedAt > existing) {
        lastTrainedByCategory[key] = completedAt;
      }
    }
  }

  const now = Date.now();
  const result: Record<
    string,
    { lastTrainedAt: string | null; recoveryPercent: number; hoursAgo: number | null }
  > = {};

  for (const [cat, recoveryHours] of Object.entries(RECOVERY_HOURS)) {
    const lastTrained = lastTrainedByCategory[cat];
    if (!lastTrained) {
      result[cat] = { lastTrainedAt: null, recoveryPercent: 100, hoursAgo: null };
    } else {
      const hoursAgo = (now - lastTrained.getTime()) / (1000 * 60 * 60);
      const recoveryPercent = Math.min(100, Math.round((hoursAgo / recoveryHours) * 100));
      result[cat] = {
        lastTrainedAt: lastTrained.toISOString(),
        recoveryPercent,
        hoursAgo: Math.round(hoursAgo),
      };
    }
  }

  return NextResponse.json({ muscles: result });
}
