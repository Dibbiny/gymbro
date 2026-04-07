import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const maxDuration = 30;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ hints: [] });
  }

  const { sessionId } = await params;

  // Get the current session and its exercises via planDay
  const trainingSession = await db.trainingSession.findUnique({
    where: { id: sessionId },
    select: {
      userId: true,
      planDayId: true,
      planDay: {
        include: {
          planDayExercises: {
            orderBy: { orderIndex: "asc" },
            include: { exercise: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });

  if (!trainingSession) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (trainingSession.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const exercises = trainingSession.planDay?.planDayExercises ?? [];
  if (exercises.length === 0) return NextResponse.json({ hints: [] });

  // For each exercise, fetch last 3 completed sessions' set logs
  const exerciseHistories: {
    exerciseId: string;
    exerciseName: string;
    history: { date: string; sets: { weight: string; reps: number }[] }[];
  }[] = [];

  for (const pde of exercises) {
    const recentLogs = await db.setLog.findMany({
      where: {
        exerciseId: pde.exercise.id,
        session: {
          userId: session.user.id,
          completedAt: { not: null },
          id: { not: sessionId },
        },
      },
      orderBy: { loggedAt: "desc" },
      take: 15, // up to 3 sessions × 5 sets
      select: { weightKg: true, repsCompleted: true, setNumber: true, loggedAt: true, sessionId: true },
    });

    if (recentLogs.length === 0) continue;

    // Group by sessionId to reconstruct sessions
    const bySession = new Map<string, typeof recentLogs>();
    for (const log of recentLogs) {
      if (!bySession.has(log.sessionId)) bySession.set(log.sessionId, []);
      bySession.get(log.sessionId)!.push(log);
    }

    const history = Array.from(bySession.values())
      .slice(0, 3)
      .map((sessionLogs) => ({
        date: new Date(sessionLogs[0].loggedAt).toLocaleDateString(),
        sets: sessionLogs.map((l) => ({
          weight: l.weightKg != null ? `${l.weightKg} kg` : "BW",
          reps: l.repsCompleted,
        })),
      }));

    exerciseHistories.push({
      exerciseId: pde.exercise.id,
      exerciseName: pde.exercise.name,
      history,
    });
  }

  if (exerciseHistories.length === 0) return NextResponse.json({ hints: [] });

  // Build prompt — one call for all exercises
  const exerciseBlocks = exerciseHistories.map((ex) => {
    const histLines = ex.history
      .map((h, i) => {
        const sets = h.sets.map((s) => `${s.weight} × ${s.reps}`).join(", ");
        return `  Session -${i + 1} (${h.date}): ${sets}`;
      })
      .join("\n");
    return `Exercise: ${ex.exerciseName} (id: ${ex.exerciseId})\n${histLines}`;
  });

  const prompt = `You are a strength coach. Based on the training history below, give a short one-line progression suggestion for each exercise for today's workout.

${exerciseBlocks.join("\n\n")}

Return a JSON object with this structure:
{
  "hints": [
    { "exerciseId": "<id>", "hint": "<one-line suggestion, max 80 chars>" }
  ]
}

Rules:
- Only include exercises that have enough history to suggest progression (at least 1 previous session)
- Be specific: mention target weight or reps (e.g. "Try 65 kg — you hit 62.5 kg × 8 last time")
- If the user is already progressing well, confirm to maintain or push slightly
- If only 1 session of data, suggest matching it or adding 1 rep
- Keep each hint under 80 characters`;

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", maxOutputTokens: 2048 },
      }),
    }
  );

  if (!geminiRes.ok) {
    console.error("Gemini overload hints error:", await geminiRes.text());
    return NextResponse.json({ hints: [] });
  }

  const data = await geminiRes.json();
  const rawText: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

  try {
    const parsed = JSON.parse(rawText);
    return NextResponse.json({ hints: parsed.hints ?? [] });
  } catch {
    return NextResponse.json({ hints: [] });
  }
}
