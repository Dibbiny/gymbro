import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const maxDuration = 30;

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  const userId = session.user.id;

  // ── Date bounds ──────────────────────────────────────────────
  const now = new Date();
  // Last full Mon–Sun week
  const dayOfWeek = (now.getDay() + 6) % 7; // 0=Mon … 6=Sun
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - dayOfWeek);
  thisMonday.setHours(0, 0, 0, 0);

  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);
  const lastSunday = new Date(thisMonday);
  lastSunday.setMilliseconds(-1); // end of previous Sunday

  const prevMonday = new Date(lastMonday);
  prevMonday.setDate(lastMonday.getDate() - 7);

  // ── Fetch last week's completed sessions ─────────────────────
  const lastWeekSessions = await db.trainingSession.findMany({
    where: {
      userId,
      completedAt: { gte: lastMonday, lte: lastSunday },
    },
    include: {
      planDay: { select: { label: true } },
      setLogs: {
        include: { exercise: { select: { name: true, muscleGroups: true } } },
      },
    },
    orderBy: { completedAt: "asc" },
  });

  if (lastWeekSessions.length === 0) {
    return NextResponse.json({
      summary: null,
      reason: "No sessions found for last week",
    });
  }

  // ── Fetch previous week for comparison ───────────────────────
  const prevWeekSessions = await db.trainingSession.findMany({
    where: {
      userId,
      completedAt: { gte: prevMonday, lt: lastMonday },
    },
    include: {
      setLogs: {
        include: { exercise: { select: { name: true } } },
      },
    },
  });

  // ── Compute metrics ──────────────────────────────────────────
  const totalSets = lastWeekSessions.reduce((n, s) => n + s.setLogs.length, 0);
  const totalVolume = lastWeekSessions.reduce(
    (n, s) => n + s.setLogs.reduce((a, l) => a + (l.weightKg ?? 0) * l.repsCompleted, 0),
    0
  );

  // Best set per exercise (highest weight)
  const bestByExercise = new Map<string, { weight: number; reps: number }>();
  for (const s of lastWeekSessions) {
    for (const l of s.setLogs) {
      const name = l.exercise.name;
      const existing = bestByExercise.get(name);
      if (!existing || (l.weightKg ?? 0) > existing.weight) {
        bestByExercise.set(name, { weight: l.weightKg ?? 0, reps: l.repsCompleted });
      }
    }
  }

  // Muscle group volume distribution
  const muscleVolume = new Map<string, number>();
  for (const s of lastWeekSessions) {
    for (const l of s.setLogs) {
      const groups = l.exercise.muscleGroups;
      const vol = (l.weightKg ?? 0) * l.repsCompleted;
      for (const g of groups.length ? groups : ["OTHER"]) {
        muscleVolume.set(g, (muscleVolume.get(g) ?? 0) + vol);
      }
    }
  }
  const topMuscle = [...muscleVolume.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Prev week volume for comparison
  const prevVolume = prevWeekSessions.reduce(
    (n, s) => n + s.setLogs.reduce((a, l) => a + (l.weightKg ?? 0) * l.repsCompleted, 0),
    0
  );
  const volumeDelta = prevVolume > 0 ? Math.round(((totalVolume - prevVolume) / prevVolume) * 100) : null;

  // Session labels
  const sessionDescriptions = lastWeekSessions.map((s) => {
    const label = s.planDay?.label ?? "Workout";
    const exercises = [...new Set(s.setLogs.map((l) => l.exercise.name))].slice(0, 4).join(", ");
    const vol = Math.round(s.setLogs.reduce((a, l) => a + (l.weightKg ?? 0) * l.repsCompleted, 0));
    return `- ${label}: ${exercises} (${vol} kg total volume)`;
  });

  // Top lifts text
  const topLifts = [...bestByExercise.entries()]
    .sort((a, b) => b[1].weight - a[1].weight)
    .slice(0, 5)
    .map(([name, { weight, reps }]) => `${name}: ${weight > 0 ? `${weight} kg × ${reps} reps` : `${reps} reps (BW)`}`);

  // ── Build Gemini prompt ───────────────────────────────────────
  const prompt = `You are an encouraging, data-driven fitness coach. Write a weekly training recap for an athlete based on the data below. 

LAST WEEK DATA:
- Sessions completed: ${lastWeekSessions.length}
- Total sets: ${totalSets}
- Total volume: ${Math.round(totalVolume).toLocaleString()} kg
- Volume vs previous week: ${volumeDelta !== null ? `${volumeDelta > 0 ? "+" : ""}${volumeDelta}%` : "first week of data"}
- Most trained muscle group: ${topMuscle ?? "mixed"}

Sessions breakdown:
${sessionDescriptions.join("\n")}

Top lifts this week:
${topLifts.join("\n")}

Write a recap with these EXACT sections:
1. A short motivating headline (max 10 words, no punctuation at end)
2. "overview": 2-3 sentences covering what the week looked like overall. Mention the volume number and sessions count. If there's a comparison to the previous week, call it out.
3. "highlight": 1 sentence about the standout lift or achievement this week. Be specific with the numbers.
4. "tip": 1 actionable coaching tip for next week based on the data (e.g. a muscle group that was undertrained, or a progressive overload suggestion).

Return a JSON object with this exact structure:
{
  "headline": "...",
  "overview": "...",
  "highlight": "...",
  "tip": "..."
}

Rules:
- Second person ("You trained...", "Your top lift...")  
- No hashtags, no emojis
- Be specific with numbers from the data
- Keep each section concise and punchy`;

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", maxOutputTokens: 1024 },
      }),
    }
  );

  if (!geminiRes.ok) {
    console.error("Gemini weekly summary error:", await geminiRes.text());
    return NextResponse.json({ error: "AI generation failed" }, { status: 502 });
  }

  const data = await geminiRes.json();
  const rawText: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

  try {
    const parsed = JSON.parse(rawText);
    return NextResponse.json({
      summary: parsed,
      meta: {
        sessions: lastWeekSessions.length,
        totalSets,
        totalVolume: Math.round(totalVolume),
        volumeDelta,
        topMuscle,
        weekStart: lastMonday.toISOString(),
        weekEnd: lastSunday.toISOString(),
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 502 });
  }
}
