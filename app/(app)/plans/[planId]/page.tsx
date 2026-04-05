import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Calendar, Users, Lock, Globe, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlanActions } from "@/components/plans/PlanActions";
import { PlanOwnerActions } from "@/components/plans/PlanOwnerActions";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Props {
  params: Promise<{ planId: string }>;
}

export default async function PlanDetailPage({ params }: Props) {
  const session = await auth();
  const { planId } = await params;

  const plan = await db.trainingPlan.findUnique({
    where: { id: planId },
    include: {
      creator: { select: { id: true, username: true, avatarUrl: true } },
      // Only fetch week 1 as the representative schedule — avoids loading
      // all 36+ days for a 12-week plan on every page view
      planDays: {
        where: { weekNumber: 1 },
        orderBy: { dayOfWeek: "asc" },
        include: {
          planDayExercises: {
            orderBy: { orderIndex: "asc" },
            include: { exercise: { select: { id: true, name: true, categories: { select: { name: true } } } } },
          },
        },
      },
      planRatings: {
        where: { userId: session!.user.id },
        select: { rating: true },
      },
      planEnrollments: {
        where: { userId: session!.user.id },
        select: { id: true, isActive: true, startDate: true },
      },
      _count: { select: { planEnrollments: true } },
    },
  });

  if (!plan) notFound();

  const isOwner = plan.creatorId === session!.user.id;

  // Check access for private plans
  if (plan.visibility === "PRIVATE" && !isOwner) {
    const follow = await db.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: session!.user.id,
          followingId: plan.creatorId,
        },
      },
    });
    if (!follow || follow.status !== "ACCEPTED") notFound();
  }

  const avgRating =
    plan.starRatingCount > 0
      ? Math.round((plan.starRatingSum / plan.starRatingCount) * 10) / 10
      : 0;

  const myRating = plan.planRatings[0]?.rating ?? 0;
  const enrollment = plan.planEnrollments[0];

  // planDays is already filtered to week 1 only (representative schedule)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href="/plans" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold flex-1 truncate">{plan.title}</h1>
        {isOwner && <PlanOwnerActions planId={plan.id} />}
      </div>

      {/* Meta */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={plan.visibility === "PUBLIC" ? "default" : "secondary"}>
            {plan.visibility === "PUBLIC" ? (
              <><Globe className="h-3 w-3 mr-1" /> Public</>
            ) : (
              <><Lock className="h-3 w-3 mr-1" /> Private</>
            )}
          </Badge>
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" /> {plan.durationWeeks} weeks
          </span>
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> {plan._count.planEnrollments} enrolled
          </span>
        </div>

        {plan.description && (
          <p className="text-sm text-muted-foreground">{plan.description}</p>
        )}

        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={plan.creator.avatarUrl ?? undefined} />
            <AvatarFallback className="text-[10px]">
              {plan.creator.username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">@{plan.creator.username}</span>
        </div>
      </div>

      {/* Actions: enroll + rate */}
      <PlanActions
        planId={plan.id}
        isOwner={isOwner}
        isPublic={plan.visibility === "PUBLIC"}
        enrollment={enrollment ?? null}
        avgRating={avgRating}
        ratingCount={plan.starRatingCount}
        myRating={myRating}
      />

      <Separator />

      {/* Training days */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Training Schedule</h2>
          {plan.durationWeeks > 1 && (
            <span className="text-xs text-muted-foreground">Week 1 preview · {plan.durationWeeks} weeks total</span>
          )}
        </div>

        <div className="space-y-2">
          {plan.planDays.map((day: any) => (
            <div key={day.id} className="rounded-xl border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">{DAY_NAMES[day.dayOfWeek]}</span>
                {day.label && (
                  <Badge variant="secondary" className="text-xs">{day.label}</Badge>
                )}
              </div>
              {day.planDayExercises.length === 0 ? (
                <p className="text-xs text-muted-foreground">Rest day</p>
              ) : (
                <div className="space-y-1.5">
                  {day.planDayExercises.map((pde: any) => (
                    <div key={pde.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium">{pde.exercise.name}</span>
                        <Badge variant="outline" className="ml-1.5 text-[10px] py-0">
                          {pde.exercise.categories.map((c: any) => c.name).join(", ")}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">
                        {pde.sets}×{pde.reps} · {pde.restSeconds}s rest
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
