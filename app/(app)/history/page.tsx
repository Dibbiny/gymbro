import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "@/lib/time";
import { Calendar, Dumbbell, Clock, Trophy, Shuffle } from "lucide-react";

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
        planDay: {
          include: {
            plan: { select: { title: true } },
          },
        },
        _count: { select: { setLogs: true } },
      },
      orderBy: { completedAt: "desc" },
      take: 50,
    }),
    db.planEnrollment.findMany({
      where: { userId: session!.user.id, completedAt: { not: null } },
      include: {
        plan: { select: { id: true, title: true, durationWeeks: true } },
      },
      orderBy: { completedAt: "desc" },
    }),
  ]);

  const tabs = [
    { value: "sessions", label: "Sessions" },
    { value: "plans", label: "Completed Plans" },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">History</h1>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map((t) => (
          <a
            key={t.value}
            href={`/history?tab=${t.value}`}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              tab === t.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {t.label}
          </a>
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
            sessions.map((s) => {
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
                <div
                  key={s.id}
                  className="rounded-xl border p-3.5 space-y-2"
                >
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
                            : s.planDay?.label ??
                              (s.planDay ? DAY_NAMES[s.planDay.dayOfWeek] : "Workout")}
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
                </div>
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
            completedPlans.map((e) => (
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
    </div>
  );
}
