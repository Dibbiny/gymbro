import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "@/lib/time";
import { Calendar, Dumbbell, Clock, Trophy, Shuffle, Download } from "lucide-react";
import { ProgressCharts } from "@/components/history/ProgressCharts";
import Link from "next/link";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Props {
  searchParams: Promise<{ tab?: string }>;
}

export default async function HistoryPage({ searchParams }: Props) {
  const session = await auth();
  const { tab = "sessions" } = await searchParams;

  const [sessions, completedPlans] = await Promise.all([
    db.trainingSession.findMany({
      where: { userId: session!.user.id, completedAt: { not: null } },
      include: {
        planDay: { include: { plan: { select: { title: true } } } },
        _count: { select: { setLogs: true } },
      },
      orderBy: { completedAt: "desc" },
      take: 50,
    }),
    db.planEnrollment.findMany({
      where: { userId: session!.user.id, completedAt: { not: null } },
      include: { plan: { select: { id: true, title: true, durationWeeks: true } } },
      orderBy: { completedAt: "desc" },
    }),
  ]);

  // For progress tab: exercises the user has logged
  const exercisesLogged = tab === "progress"
    ? await db.setLog.findMany({
        where: { session: { userId: session!.user.id, completedAt: { not: null } } },
        select: { exercise: { select: { id: true, name: true } } },
        distinct: ["exerciseId"],
        orderBy: { exercise: { name: "asc" } },
      }).then((rows: any[]) => rows.map((r: any) => r.exercise))
    : [];

  // Weekly volume by muscle group (last 8 weeks)
  const weeklyVolume: { week: string; [cat: string]: number | string }[] = [];
  if (tab === "progress") {
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

    const allSets = await db.setLog.findMany({
      where: {
        session: {
          userId: session!.user.id,
          completedAt: { not: null, gte: eightWeeksAgo },
        },
      },
      select: {
        weightKg: true,
        repsCompleted: true,
        exercise: { select: { categories: { select: { name: true } } } },
        session: { select: { completedAt: true } },
      },
    });

    const byWeek: Record<string, Record<string, number>> = {};
    for (const s of allSets) {
      const d = new Date(s.session.completedAt!);
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const week = monday.toISOString().slice(0, 10);
      if (!byWeek[week]) byWeek[week] = {};
      const cat = s.exercise.categories[0]?.name ?? "Other";
      byWeek[week][cat] = (byWeek[week][cat] ?? 0) + (s.weightKg ?? 0) * s.repsCompleted;
    }

    for (const [week, cats] of Object.entries(byWeek).sort()) {
      weeklyVolume.push({ week: week.slice(5), ...cats });
    }
  }

  const tabs = [
    { value: "sessions", label: "Sessions" },
    { value: "plans", label: "Completed Plans" },
    { value: "progress", label: "Progress" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">History</h1>
        <a
          href="/api/history/export"
          download
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-8 text-sm font-medium hover:bg-muted transition-colors"
        >
          <Download className="h-3.5 w-3.5" /> Export CSV
        </a>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map((t: any) => (
          <Link
            key={t.value}
            href={`/history?tab=${t.value}`}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              tab === t.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Sessions tab */}
      {tab === "sessions" && (
        <div className="space-y-2">
          {sessions.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center space-y-2">
              <Dumbbell className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No completed sessions yet</p>
            </div>
          ) : (
            sessions.map((s: any) => {
              const duration = s.completedAt
                ? Math.floor(
                    (new Date(s.completedAt).getTime() - new Date(s.startedAt).getTime()) / 1000 -
                      s.pausedDuration
                  )
                : 0;

              let isRandomDay = false;
              try {
                if (s.notes) {
                  const parsed = JSON.parse(s.notes);
                  isRandomDay = parsed.randomDay === true;
                }
              } catch {}

              return (
                <Link key={s.id} href={`/sessions/${s.id}`} className="block rounded-xl border p-3.5 space-y-2 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {isRandomDay ? (
                        <Shuffle className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <Dumbbell className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-semibold">
                          {isRandomDay
                            ? "Random Day"
                            : s.planDay?.label ?? (s.planDay ? DAY_NAMES[s.planDay.dayOfWeek] : "Workout")}
                        </p>
                        {s.planDay?.plan && (
                          <p className="text-xs text-muted-foreground">{s.planDay.plan.title}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {s._count.setLogs} sets
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDistanceToNow(new Date(s.completedAt!))}
                    </span>
                    {duration > 60 && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(duration)}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      )}

      {/* Completed plans tab */}
      {tab === "plans" && (
        <div className="space-y-2">
          {completedPlans.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center space-y-2">
              <Trophy className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No completed plans yet — keep going!</p>
            </div>
          ) : (
            completedPlans.map((e: any) => (
              <div key={e.id} className="rounded-xl border p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-500 shrink-0" />
                    <p className="text-sm font-semibold">{e.plan.title}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">{e.plan.durationWeeks}w</Badge>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Completed {formatDistanceToNow(new Date(e.completedAt!))}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Progress tab */}
      {tab === "progress" && (
        exercisesLogged.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center space-y-2">
            <Dumbbell className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Complete some workouts to see progress charts</p>
          </div>
        ) : (
          <ProgressCharts exercises={exercisesLogged} weeklyVolume={weeklyVolume} />
        )
      )}
    </div>
  );
}
