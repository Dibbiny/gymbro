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

  const prompt = `You are an encouraging fitness coach. Write a single sentence (max 180 characters) post-workout caption for someone who just finished their ${workoutLabel}.

Today's performance:
${todayLines.join("\n")}${prevSummary}

Rules:
- Exactly ONE sentence, complete, no ellipsis
- Be specific — mention at least one exercise name or a weight/rep number from the data
- If previous session data exists, call out an improvement (e.g. "up from X kg last time")
- Energetic and motivating, second person ("You crushed...", "You hit...")
- No hashtags, no emojis, no quotation marks
- Return plain text only, nothing else`;

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 1024 },
      }),
    }
  );

  if (!geminiRes.ok) {
    console.error("Gemini summary error:", await geminiRes.text());
    return NextResponse.json({ error: "AI generation failed" }, { status: 502 });
  }

  const data = await geminiRes.json();
  console.log("[ai-summary] full Gemini response:", JSON.stringify(data, null, 2));

  const candidate = data?.candidates?.[0];
  const finishReason = candidate?.finishReason;
  const summary: string = candidate?.content?.parts?.[0]?.text?.trim() ?? "";

  console.log("[ai-summary] finishReason:", finishReason, "| summary:", summary);

  // Discard if it looks incomplete (no sentence-ending punctuation)
  const endsCleanly = /[.!?]$/.test(summary);
  if (!summary || !endsCleanly) {
    console.warn("[ai-summary] discarded — incomplete or empty. finishReason:", finishReason, "| text:", summary);
    return NextResponse.json({ summary: null });
  }

  return NextResponse.json({ summary });
}
