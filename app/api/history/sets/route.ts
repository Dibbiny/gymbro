import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/history/sets?exerciseId=xxx
export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const exerciseId = searchParams.get("exerciseId");
  if (!exerciseId) return NextResponse.json({ error: "exerciseId required" }, { status: 400 });

  const sets = await db.setLog.findMany({
    where: {
      session: { userId: session.user.id, completedAt: { not: null } },
      exerciseId,
    },
    select: {
      weightKg: true,
      repsCompleted: true,
      session: { select: { completedAt: true } },
    },
    orderBy: { session: { completedAt: "asc" } },
  });

  const byDate: Record<string, { maxWeight: number; volume: number }> = {};
  for (const s of sets) {
    const weight = s.weightKg ?? 0;
    const date = s.session.completedAt!.toISOString().slice(0, 10);
    if (!byDate[date]) byDate[date] = { maxWeight: 0, volume: 0 };
    byDate[date].maxWeight = Math.max(byDate[date].maxWeight, weight);
    byDate[date].volume += weight * s.repsCompleted;
  }

  const data = Object.entries(byDate).map(([date, v]) => ({ date, ...v }));
  return NextResponse.json({ data });
}
