import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "@/lib/time";
import { ExerciseApprovalActions } from "@/components/admin/ExerciseApprovalActions";
import { ExerciseSubmitForm } from "@/components/exercises/ExerciseSubmitForm";
import { CategoryManager } from "@/components/admin/CategoryManager";
import { AdminExerciseList } from "@/components/admin/AdminExerciseList";

export default async function AdminExercisesPage() {
  const session = await auth();

  const [pending, approved, rejected, categories] = await Promise.all([
    db.exercise.findMany({
      where: { status: "PENDING" },
      include: {
        submittedBy: { select: { username: true } },
        categories: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    db.exercise.findMany({
      where: { status: "APPROVED" },
      include: {
        submittedBy: { select: { username: true } },
        categories: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    }),
    db.exercise.findMany({
      where: { status: "REJECTED" },
      include: {
        submittedBy: { select: { username: true } },
        categories: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    }),
    db.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      {/* Category management */}
      <section className="space-y-3">
        <h2 className="font-semibold">Manage Categories</h2>
        <CategoryManager initialCategories={categories} />
      </section>

      {/* Add exercise directly */}
      <section className="space-y-3">
        <h2 className="font-semibold">Add exercise</h2>
        <ExerciseSubmitForm autoApprove />
      </section>

      {/* Pending */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Pending Approval</h2>
          {pending.length > 0 && (
            <Badge variant="destructive" className="text-xs">{pending.length}</Badge>
          )}
        </div>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">All caught up!</p>
        ) : (
          <div className="space-y-2">
            {pending.map((ex: any) => (
              <div key={ex.id} className="rounded-xl border p-3.5 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{ex.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {ex.categories.map((c: any) => c.name).join(", ")} · by @{ex.submittedBy.username} · {formatDistanceToNow(new Date(ex.createdAt))}
                    </p>
                    {ex.description && (
                      <p className="text-xs text-muted-foreground mt-1">{ex.description}</p>
                    )}
                    {ex.demoUrl && (
                      <a href={ex.demoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                        Demo link
                      </a>
                    )}
                  </div>
                  <ExerciseApprovalActions exerciseId={ex.id} adminId={session!.user.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Approved */}
      <section>
        <AdminExerciseList exercises={approved} allCategories={categories} label="Approved" />
      </section>

      {rejected.length > 0 && (
        <section>
          <AdminExerciseList exercises={rejected} allCategories={categories} label="Rejected" dimmed />
        </section>
      )}
    </div>
  );
}
