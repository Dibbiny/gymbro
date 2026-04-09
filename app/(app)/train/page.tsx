import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { StartSessionButton } from "@/components/training/StartSessionButton";
import { UnenrollButton } from "@/components/training/UnenrollButton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Dumbbell, Play, Shuffle } from "lucide-react";

export default async function TrainPage() {
  const session = await auth();

  const enrollments = await db.planEnrollment.findMany({
    where: { userId: session!.user.id, isActive: true },
    include: {
      plan: {
        include: {
          planDays: {
            include: {
              planDayExercises: {
                include: { exercise: { select: { name: true } } },
                orderBy: { orderIndex: "asc" },
              },
            },
            orderBy: [{ weekNumber: "asc" }, { dayOfWeek: "asc" }],
          },
        },
      },
      trainingSessions: {
        select: {
          id: true,
          planDayId: true,
          completedAt: true,
          planDay: { select: { dayOfWeek: true } },
          _count: { select: { setLogs: true } },
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Train</h1>
        <Link
          href="/train/random"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-8 text-sm font-medium hover:bg-muted transition-colors"
        >
          <Shuffle className="h-3.5 w-3.5" /> Random
        </Link>
      </div>

      {enrollments.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center space-y-2">
          <Dumbbell className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="font-medium">No active plans</p>
          <p className="text-sm text-muted-foreground">
            Browse plans and enroll to start training
          </p>
          <Link
            href="/plans"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 h-9 text-sm font-medium text-primary-foreground mt-2 hover:bg-primary/80 transition-colors"
          >
            Browse Plans
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {enrollments.map((enrollment: any) => {
            const plan = enrollment.plan;
            const completedDayIds = new Set(
              enrollment.trainingSessions
                .filter((s: any) => s.completedAt !== null)
                .map((s: any) => s.planDayId)
                .filter(Boolean)
            );
            // Map planDayId → sessionId for sessions that are in-progress (incomplete + has logged sets)
            const activeSessionByDayId = new Map(
              enrollment.trainingSessions
                .filter((s: any) => s.completedAt === null && s.planDayId && s._count.setLogs > 0)
                .map((s: any) => [s.planDayId!, s.id])
            );
            const allTrainingDays = plan.planDays.filter((d: any) => d.planDayExercises.length > 0);
            const totalDays = allTrainingDays.length;
            const completedCount = allTrainingDays.filter((d: any) => completedDayIds.has(d.id)).length;
            const progressPct = totalDays > 0 ? Math.round((completedCount / totalDays) * 100) : 0;

            // For each completed day, unlock the same dayOfWeek in the next week
            const unlockedIds = new Set<string>();
            for (const d of allTrainingDays) {
              if (!completedDayIds.has(d.id)) continue;
              const successor = allTrainingDays.find(
                (s: any) => s.weekNumber === d.weekNumber + 1 && s.dayOfWeek === d.dayOfWeek
              );
              if (successor && !completedDayIds.has(successor.id)) {
                unlockedIds.add(successor.id);
              }
            }

            // Current week = lowest week that has any incomplete day
            const incomplete = allTrainingDays.filter((d: any) => !completedDayIds.has(d.id));
            const currentWeek = incomplete.length > 0
              ? Math.min(...incomplete.map((d: any) => d.weekNumber))
              : 1;

            const doneDays = allTrainingDays.filter((d: any) => completedDayIds.has(d.id));
            const upcomingDays = allTrainingDays.filter((d: any) =>
              !completedDayIds.has(d.id) &&
              (d.weekNumber === currentWeek || unlockedIds.has(d.id))
            );

            return (
              <Card key={enrollment.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{plan.title}</CardTitle>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant="secondary" className="text-xs">
                        {plan.durationWeeks}w
                      </Badge>
                      <UnenrollButton planId={plan.id} planTitle={plan.title} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                    <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <span>{completedCount}/{totalDays} days</span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-2">
                  {/* Completed days — compact */}
                  {doneDays.map((day: any) => (
                    <div key={day.id} className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate text-muted-foreground">
                          Wk {day.weekNumber} · {day.label ?? `Day ${day.dayOfWeek + 1}`}
                        </p>
                      </div>
                      <span className="flex items-center gap-1 text-xs text-primary font-medium shrink-0">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Done
                      </span>
                    </div>
                  ))}

                  {/* Upcoming days — full detail */}
                  {upcomingDays.map((day: any) => {
                    const activeSessionId = activeSessionByDayId.get(day.id);
                    return (
                      <div key={day.id} className={`rounded-lg border px-3 py-2.5 space-y-1.5 ${activeSessionId ? "border-primary/50 bg-primary/5" : ""}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">
                              Wk {day.weekNumber} · {day.label ?? `Day ${day.dayOfWeek + 1}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {day.planDayExercises.length} exercises
                            </p>
                          </div>
                          {activeSessionId ? (
                            <Link
                              href={`/train/session/${activeSessionId}`}
                              className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 h-8 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
                            >
                              <Play className="h-3 w-3" /> Resume
                            </Link>
                          ) : (
                            <StartSessionButton
                              enrollmentId={enrollment.id}
                              planDayId={day.id}
                              compact
                            />
                          )}
                        </div>
                        <div className="space-y-0.5">
                          {day.planDayExercises.slice(0, 3).map((pde: any) => (
                            <p key={pde.id} className="text-xs text-muted-foreground">
                              {pde.exercise.name} — {pde.sets}×{pde.reps}
                            </p>
                          ))}
                          {day.planDayExercises.length > 3 && (
                            <p className="text-xs text-muted-foreground">
                              +{day.planDayExercises.length - 3} more
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {upcomingDays.length === 0 && doneDays.length > 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">Plan complete!</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
