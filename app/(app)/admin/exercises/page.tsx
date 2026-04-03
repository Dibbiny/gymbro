import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "@/lib/time";
import { ExerciseApprovalActions } from "@/components/admin/ExerciseApprovalActions";
import { ExerciseAdminActions } from "@/components/admin/ExerciseAdminActions";
import { ExerciseSubmitForm } from "@/components/exercises/ExerciseSubmitForm";

export default async function AdminExercisesPage() {
  const session = await auth();

  const [pending, approved, rejected] = await Promise.all([
    db.exercise.findMany({
      where: { status: "PENDING" },
      include: { submittedBy: { select: { username: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.exercise.findMany({
      where: { status: "APPROVED" },
      include: { submittedBy: { select: { username: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    db.exercise.findMany({
      where: { status: "REJECTED" },
      include: { submittedBy: { select: { username: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div className="space-y-6">
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
            {pending.map((ex) => (
              <div key={ex.id} className="rounded-xl border p-3.5 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{ex.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {ex.category} · by @{ex.submittedBy.username} · {formatDistanceToNow(new Date(ex.createdAt))}
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
      <section className="space-y-3">
        <h2 className="font-semibold text-sm text-muted-foreground">Approved ({approved.length})</h2>
        <div className="space-y-1.5">
          {approved.map((ex) => (
            <div key={ex.id} className="flex items-center justify-between rounded-lg border px-3 py-2 gap-2">
              <div className="min-w-0">
                <span className="text-sm font-medium">{ex.name}</span>
                <span className="text-xs text-muted-foreground ml-2">{ex.category}</span>
              </div>
              <ExerciseAdminActions exercise={ex} />
            </div>
          ))}
        </div>
      </section>

      {rejected.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground">Rejected ({rejected.length})</h2>
          <div className="space-y-1.5">
            {rejected.map((ex) => (
              <div key={ex.id} className="flex items-center justify-between rounded-lg border px-3 py-2 gap-2 opacity-70">
                <div className="min-w-0">
                  <span className="text-sm font-medium">{ex.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">{ex.category}</span>
                </div>
                <ExerciseAdminActions exercise={ex} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
