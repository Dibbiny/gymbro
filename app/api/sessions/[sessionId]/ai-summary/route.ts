import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const maxDuration = 30;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  const { sessionId } = await params;

  const trainingSession = await db.trainingSession.findUnique({
    where: { id: sessionId, completedAt: { not: null } },
    include: {
      planDay: { select: { label: true, dayOfWeek: true } },
      setLogs: {
        orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }],
        include: { exercise: { select: { name: true } } },
      },
    },
  });

  if (!trainingSession) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (trainingSession.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (trainingSession.setLogs.length === 0) {
    return NextResponse.json({ summary: "Great workout! Keep up the consistency." });
  }

  // Group sets by exercise
  const byExercise = new Map<string, typeof trainingSession.setLogs>();
  for (const log of trainingSession.setLogs) {
    if (!byExercise.has(log.exerciseId)) byExercise.set(log.exerciseId, []);
    byExercise.get(log.exerciseId)!.push(log);
  }

  // Fetch previous session for the same plan day for comparison
  let prevSummary = "";
  if (trainingSession.planDayId) {
    const prevSession = await db.trainingSession.findFirst({
      where: {
        userId: session.user.id,
        planDayId: trainingSession.planDayId,
        completedAt: { not: null },
        id: { not: sessionId },
      },
      orderBy: { completedAt: "desc" },
      include: {
        setLogs: {
          orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }],
          include: { exercise: { select: { name: true } } },
        },
      },
    });

    if (prevSession) {
      const prevByEx = new Map<string, typeof prevSession.setLogs>();
      for (const log of prevSession.setLogs) {
        if (!prevByEx.has(log.exerciseId)) prevByEx.set(log.exerciseId, []);
        prevByEx.get(log.exerciseId)!.push(log);
      }
      const prevLines = Array.from(prevByEx.values()).map((logs) => {
        const name = logs[0].exercise.name;
        const best = logs.reduce((a, b) => ((b.weightKg ?? 0) > (a.weightKg ?? 0) ? b : a));
        return `${name}: ${best.weightKg ?? "BW"} kg × ${best.repsCompleted} reps (${logs.length} sets)`;
      });
      prevSummary = `\nPrevious session for this workout:\n${prevLines.join("\n")}`;
    }
  }

  // Build today's performance summary
  const todayLines = Array.from(byExercise.values()).map((logs) => {
    const name = logs[0].exercise.name;
    const sets = logs.map((l) => `${l.weightKg ?? "BW"} kg × ${l.repsCompleted} reps`).join(", ");
    return `${name}: ${sets}`;
  });

  const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const workoutLabel =
    trainingSession.planDay?.label ??
    (trainingSession.planDay ? DAY_NAMES[trainingSession.planDay.dayOfWeek] : "workout");

  const prompt = `You are an encouraging fitness coach. Write a 2-3 sentence post-workout summary for someone who just finished their ${workoutLabel}.

Today's performance:
${todayLines.join("\n")}${prevSummary}

Rules:
- Be specific — mention exercise names, weights, or reps where relevant
- If previous session data exists, mention improvements or consistency
- Keep it under 200 characters total — it's a social media caption
- Energetic and motivating, first person ("I crushed..." or second person "You hit...")
- No hashtags, no emojis
- Return plain text only, no JSON`;

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 100 },
      }),
    }
  );

  if (!geminiRes.ok) {
    console.error("Gemini summary error:", await geminiRes.text());
    return NextResponse.json({ error: "AI generation failed" }, { status: 502 });
  }

  const data = await geminiRes.json();
  const summary: string = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

  return NextResponse.json({ summary });
}
