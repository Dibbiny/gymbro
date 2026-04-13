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
      session: { select: { id: true, completedAt: true } },
    },
    orderBy: { session: { completedAt: "asc" } },
  });

  // One data point per session (not per date), so two sessions on the
  // same day both appear and the line connects them correctly.
  const bySession: Record<string, { date: string; maxWeight: number; volume: number }> = {};
  for (const s of sets) {
    const id = s.session.id;
    const weight = s.weightKg ?? 0;
    if (!bySession[id]) {
      bySession[id] = {
        date: s.session.completedAt!.toISOString().slice(0, 10),
        maxWeight: 0,
        volume: 0,
      };
    }
    bySession[id].maxWeight = Math.max(bySession[id].maxWeight, weight);
    bySession[id].volume += weight * s.repsCompleted;
  }

  const data = Object.values(bySession);
  return NextResponse.json({ data });
}
