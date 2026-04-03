import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { StartSessionButton } from "@/components/training/StartSessionButton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CheckCircle2, Dumbbell, Shuffle } from "lucide-react";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
          },
        },
      },
      trainingSessions: {
        where: { completedAt: { not: null } },
        select: { id: true, planDayId: true },
      },
    },
    orderBy: { enrolledAt: "desc" },
  });

  const today = new Date();
  const todayDow = (today.getDay() + 6) % 7; // convert Sun=0 to Mon=0

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
          {enrollments.map((enrollment) => {
            const plan = enrollment.plan;
            const startDate = new Date(enrollment.startDate);
            const daysSinceStart = Math.floor(
              (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            const currentWeek = Math.min(
              Math.floor(daysSinceStart / 7) + 1,
              plan.durationWeeks
            );

            // Find today's training day
            const todayDay = plan.planDays.find(
              (d) => d.dayOfWeek === todayDow && d.weekNumber === currentWeek
            ) ?? plan.planDays.find((d) => d.dayOfWeek === todayDow);

            const completedDayIds = new Set(
              enrollment.trainingSessions.map((s) => s.planDayId).filter(Boolean)
            );
            const todayDone = todayDay ? completedDayIds.has(todayDay.id) : false;

            const totalDays = plan.planDays.length;
            const completedDays = completedDayIds.size;
            const progressPct = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

            return (
              <Card key={enrollment.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{plan.title}</CardTitle>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      Week {currentWeek}/{plan.durationWeeks}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                    <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <span>{completedDays}/{totalDays} days</span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Today's workout */}
                  {todayDay ? (
                    <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">
                          Today — {DAY_NAMES[todayDay.dayOfWeek]}
                          {todayDay.label && ` · ${todayDay.label}`}
                        </span>
                        {todayDone && (
                          <span className="flex items-center gap-1 text-xs text-primary font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Done
                          </span>
                        )}
                      </div>

                      <div className="space-y-0.5">
                        {todayDay.planDayExercises.slice(0, 4).map((pde) => (
                          <p key={pde.id} className="text-xs text-muted-foreground">
                            {pde.exercise.name} — {pde.sets}×{pde.reps}
                          </p>
                        ))}
                        {todayDay.planDayExercises.length > 4 && (
                          <p className="text-xs text-muted-foreground">
                            +{todayDay.planDayExercises.length - 4} more
                          </p>
                        )}
                      </div>

                      {!todayDone && (
                        <StartSessionButton
                          enrollmentId={enrollment.id}
                          planDayId={todayDay.id}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground text-center py-1">
                        Rest day today
                      </p>
                      {/* Let user pick another day to train */}
                      <div className="space-y-1.5">
                        {plan.planDays
                          .filter((d) => d.planDayExercises.length > 0)
                          .map((day) => {
                            const done = completedDayIds.has(day.id);
                            return (
                              <div key={day.id} className="flex items-center justify-between rounded-lg border px-3 py-2 gap-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {DAY_NAMES[day.dayOfWeek]}{day.label ? ` · ${day.label}` : ""}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {day.planDayExercises.length} exercises
                                  </p>
                                </div>
                                {done ? (
                                  <span className="flex items-center gap-1 text-xs text-primary font-medium shrink-0">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Done
                                  </span>
                                ) : (
                                  <StartSessionButton
                                    enrollmentId={enrollment.id}
                                    planDayId={day.id}
                                    compact
                                  />
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Weekly schedule */}
                  <div className="flex gap-1.5">
                    {DAY_NAMES.map((name, i) => {
                      const hasDay = plan.planDays.some((d) => d.dayOfWeek === i);
                      const isToday = i === todayDow;
                      return (
                        <div
                          key={i}
                          className={`flex-1 text-center rounded-md py-1 text-[10px] font-medium
                            ${isToday ? "ring-1 ring-primary" : ""}
                            ${hasDay ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}
                        >
                          {name[0]}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
