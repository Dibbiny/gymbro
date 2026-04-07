import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

export const maxDuration = 60; // seconds — requires Vercel Pro or higher

const generateSchema = z.object({
  daysPerWeek: z.number().int().min(1).max(7),
  age: z.number().int().min(10).max(100),
  weightKg: z.number().min(20).max(300),
  gender: z.enum(["male", "female", "other"]),
  goals: z.string().min(1).max(500),
  notes: z.string().max(500).optional(),
});

// Gemini JSON response shape
interface GeminiDay {
  dayOfWeek: number;
  label: string;
  exercises: { exerciseName: string; sets: number; reps: number; restSeconds: number }[];
}
interface GeminiPlan {
  title: string;
  description: string;
  durationWeeks: number;
  days: GeminiDay[];
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "AI generation is not configured" }, { status: 503 });
  }

  const body = await request.json();
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { daysPerWeek, age, weightKg, gender, goals, notes } = parsed.data;

  // Fetch all approved exercises
  const exercises = await db.exercise.findMany({
    where: { status: "APPROVED" },
    select: { id: true, name: true, categories: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  if (exercises.length === 0) {
    return NextResponse.json({ error: "No exercises available in the database" }, { status: 500 });
  }

  const exerciseListText = exercises
    .map((e) => `- "${e.name}" (${e.categories.map((c) => c.name).join(", ") || "general"})`)
    .join("\n");

  const prompt = `You are a professional fitness coach. Create a personalized workout plan based on the user profile below.

USER PROFILE:
- Age: ${age}
- Gender: ${gender}
- Weight: ${weightKg} kg
- Training days per week: ${daysPerWeek}
- Goals: ${goals}${notes ? `\n- Additional notes: ${notes}` : ""}

AVAILABLE EXERCISES (you MUST only use exercises from this exact list, using the exact name as written):
${exerciseListText}

Return a JSON object with this exact structure:
{
  "title": "short plan title",
  "description": "plan description, max 400 characters",
  "durationWeeks": <integer 4–12>,
  "days": [
    {
      "dayOfWeek": <0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun>,
      "label": "day label e.g. Push Day",
      "exercises": [
        {
          "exerciseName": "<exact name from list above>",
          "sets": <2–5>,
          "reps": <5–20>,
          "restSeconds": <45–180>
        }
      ]
    }
  ]
}

RULES:
- Include exactly ${daysPerWeek} training day(s) per week, spread across different days
- Only use exercise names from the provided list (copy them exactly)
- Each day should have 4–7 exercises
- Balance muscle groups across the week based on the user's goals
- Choose appropriate sets/reps for the stated goals (e.g. strength = lower reps/heavier, hypertrophy = 8–12 reps, endurance = higher reps)
- Do not include rest days in the array — only training days`;

  // Call Gemini REST API
  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    }
  );

  if (!geminiRes.ok) {
    const err = await geminiRes.text();
    console.error("Gemini API error:", geminiRes.status, err);
    let detail = "AI generation failed";
    try {
      const parsed = JSON.parse(err);
      detail = parsed?.error?.message ?? detail;
    } catch {}
    return NextResponse.json({ error: detail }, { status: 502 });
  }

  const geminiData = await geminiRes.json();
  const rawText: string = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  let plan: GeminiPlan;
  try {
    plan = JSON.parse(rawText);
  } catch {
    console.error("Failed to parse Gemini response:", rawText);
    return NextResponse.json({ error: "AI returned an unexpected response" }, { status: 502 });
  }

  // Build name → id map (case-insensitive)
  const exerciseMap = new Map<string, string>();
  for (const ex of exercises) {
    exerciseMap.set(ex.name.toLowerCase(), ex.id);
  }

  // Map exercise names → IDs, skip unknowns
  const days = (plan.days ?? []).map((day: GeminiDay, weekIdx: number) => ({
    dayOfWeek: Math.min(6, Math.max(0, Math.round(day.dayOfWeek))),
    weekNumber: 1,
    label: day.label ?? "",
    exercises: (day.exercises ?? [])
      .map((ex, i) => {
        const id = exerciseMap.get(ex.exerciseName?.toLowerCase() ?? "");
        if (!id) return null;
        return {
          exerciseId: id,
          orderIndex: i,
          sets: Math.min(5, Math.max(1, Math.round(ex.sets))),
          reps: Math.min(1000, Math.max(1, Math.round(ex.reps))),
          restSeconds: Math.min(600, Math.max(0, Math.round(ex.restSeconds))),
        };
      })
      .filter(Boolean),
  }));

  return NextResponse.json({
    plan: {
      title: plan.title ?? "AI Generated Plan",
      description: plan.description ?? "",
      durationWeeks: Math.min(52, Math.max(1, Math.round(plan.durationWeeks ?? 8))),
      visibility: "PRIVATE" as const,
      days,
    },
  });
}
