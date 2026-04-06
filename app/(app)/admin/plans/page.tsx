import { db } from "@/lib/db";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Globe, Lock, Plus, Users } from "lucide-react";

export default async function AdminPlansPage() {
  const plans = await db.trainingPlan.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      creator: { select: { id: true, username: true } },
      _count: { select: { planEnrollments: true } },
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{plans.length} plans total</p>
        <Link
          href="/plans/new"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 h-8 text-sm font-medium hover:bg-muted transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> New Plan
        </Link>
      </div>

      <div className="space-y-2">
        {plans.map((plan: any) => (
          <Link
            key={plan.id}
            href={`/admin/plans/${plan.id}`}
            className="block rounded-xl border p-3.5 hover:bg-muted/40 transition-colors space-y-1.5"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold leading-tight">{plan.title}</p>
              <Badge
                variant={plan.visibility === "PUBLIC" ? "default" : "secondary"}
                className="text-[10px] shrink-0"
              >
                {plan.visibility === "PUBLIC" ? (
                  <><Globe className="h-2.5 w-2.5 mr-0.5" /> Public</>
                ) : (
                  <><Lock className="h-2.5 w-2.5 mr-0.5" /> Private</>
                )}
              </Badge>
            </div>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span>@{plan.creator.username}</span>
              <span>{plan.durationWeeks}w</span>
              <span className="flex items-center gap-0.5">
                <Users className="h-3 w-3" /> {plan._count.planEnrollments} enrolled
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
