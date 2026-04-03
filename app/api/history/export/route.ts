import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sets = await db.setLog.findMany({
    where: {
      session: { userId: session.user.id, completedAt: { not: null } },
    },
    select: {
      weightKg: true,
      repsCompleted: true,
      setNumber: true,
      exercise: { select: { name: true, category: true } },
      session: {
        select: {
          completedAt: true,
          planDay: { select: { label: true, plan: { select: { title: true } } } },
        },
      },
    },
    orderBy: [
      { session: { completedAt: "asc" } },
      { setNumber: "asc" },
    ],
  });

  const rows = [
    ["Date", "Plan", "Day", "Exercise", "Category", "Set", "Weight (kg)", "Reps", "Volume"],
    ...sets.map((s) => {
      const weight = s.weightKg ?? 0;
      return [
        s.session.completedAt!.toISOString().slice(0, 10),
        s.session.planDay?.plan?.title ?? "Random Day",
        s.session.planDay?.label ?? "",
        s.exercise.name,
        s.exercise.category,
        String(s.setNumber),
        String(weight),
        String(s.repsCompleted),
        String(weight * s.repsCompleted),
      ];
    }),
  ];

  const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="gymbro-history-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
