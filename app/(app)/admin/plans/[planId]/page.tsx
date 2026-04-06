import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, Globe, Lock, Pencil, Users, Calendar } from "lucide-react";
import { AdminPlanDeleteButton } from "@/components/admin/AdminPlanDeleteButton";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Props {
  params: Promise<{ planId: string }>;
}

export default async function AdminPlanDetailPage({ params }: Props) {
  const { planId } = await params;

  const plan = await db.trainingPlan.findUnique({
    where: { id: planId },
    include: {
      creator: { select: { id: true, username: true } },
      planDays: {
        where: { weekNumber: 1 },
        orderBy: { dayOfWeek: "asc" },
        include: {
          planDayExercises: {
            orderBy: { orderIndex: "asc" },
            include: { exercise: { select: { name: true } } },
          },
        },
      },
      _count: { select: { planEnrollments: true } },
    },
  });

  if (!plan) notFound();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href="/admin/plans" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold flex-1 truncate">{plan.title}</h1>
        <div className="flex items-center gap-1.5 shrink-0">
          <Link
            href={`/admin/plans/${planId}/edit`}
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border hover:bg-muted transition-colors"
          >
            <Pencil className="h-4 w-4" />
          </Link>
          <AdminPlanDeleteButton planId={planId} />
        </div>
      </div>

      {/* Meta */}
      <div className="rounded-xl border p-4 space-y-2">
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
        <p className="text-xs text-muted-foreground">
          by{" "}
          <Link href={`/admin/users/${plan.creator.id}`} className="hover:underline font-medium">
            @{plan.creator.username}
          </Link>
          {" · "}created {new Date(plan.createdAt).toLocaleDateString()}
        </p>
      </div>

      <Separator />

      {/* Week 1 preview */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Week 1 Preview</h2>
        <div className="space-y-2">
          {plan.planDays.map((day: any) => (
            <div key={day.id} className="rounded-xl border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">{DAY_NAMES[day.dayOfWeek]}</span>
                {day.label && <Badge variant="secondary" className="text-xs">{day.label}</Badge>}
              </div>
              <div className="space-y-1">
                {day.planDayExercises.map((pde: any) => (
                  <div key={pde.id} className="flex items-center justify-between text-sm">
                    <span>{pde.exercise.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">
                      {pde.sets}×{pde.reps} · {pde.restSeconds}s
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
