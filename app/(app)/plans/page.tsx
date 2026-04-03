import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PlanCard } from "@/components/plans/PlanCard";
import { PeopleSearch } from "@/components/people/PeopleSearch";
import { Plus } from "lucide-react";

interface Props {
  searchParams: Promise<{ sort?: string; page?: string; tab?: string }>;
}

export default async function PlansPage({ searchParams }: Props) {
  const session = await auth();
  const { sort = "rating", page = "1", tab = "plans" } = await searchParams;
  const pageNum = Math.max(1, parseInt(page));
  const limit = 20;

  const orderBy =
    sort === "newest"
      ? { createdAt: "desc" as const }
      : sort === "duration"
      ? { durationWeeks: "asc" as const }
      : undefined;

  const [plans, myPlans] = tab === "plans"
    ? await Promise.all([
        db.trainingPlan.findMany({
          where: { visibility: "PUBLIC" },
          include: {
            creator: { select: { username: true, avatarUrl: true } },
            _count: { select: { planEnrollments: true } },
          },
          orderBy: orderBy ?? { starRatingSum: "desc" },
          skip: (pageNum - 1) * limit,
          take: limit,
        }),
        db.trainingPlan.findMany({
          where: { creatorId: session!.user.id },
          include: {
            creator: { select: { username: true, avatarUrl: true } },
            _count: { select: { planEnrollments: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
      ])
    : [[], []];

  const sortOptions = [
    { value: "rating", label: "Top Rated" },
    { value: "newest", label: "Newest" },
    { value: "duration", label: "Duration" },
  ];

  return (
    <div className="space-y-6">
      {/* Tab switcher */}
      <div className="flex gap-2">
        <Link
          href="/plans?tab=plans"
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            tab !== "people"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Plans
        </Link>
        <Link
          href="/plans?tab=people"
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "people"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          People
        </Link>
      </div>

      {tab === "people" ? (
        <PeopleSearch />
      ) : (
        <>
          {/* My plans */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">My Plans</h2>
              <Link href="/plans/new" className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 h-8 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80">
                <Plus className="h-4 w-4" /> New
              </Link>
            </div>

            {myPlans.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                No plans yet.{" "}
                <Link href="/plans/new" className="text-primary font-medium hover:underline">
                  Create your first plan
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {myPlans.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} />
                ))}
              </div>
            )}
          </section>

          {/* Browse public plans */}
          <section className="space-y-3">
            <h2 className="font-semibold">Discover Plans</h2>

            <div className="flex gap-2">
              {sortOptions.map((opt) => (
                <Link
                  key={opt.value}
                  href={`/plans?sort=${opt.value}`}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    sort === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {opt.label}
                </Link>
              ))}
            </div>

            {plans.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No public plans yet.</p>
            ) : (
              <div className="space-y-3">
                {plans.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} />
                ))}
              </div>
            )}

            {plans.length === limit && (
              <div className="flex justify-center pt-2">
                <Link href={`/plans?sort=${sort}&page=${pageNum + 1}`} className="inline-flex items-center rounded-lg border border-border bg-background px-2.5 h-8 text-sm font-medium transition-colors hover:bg-muted">
                  Load more
                </Link>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
