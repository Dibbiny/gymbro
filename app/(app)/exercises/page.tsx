import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { ExerciseSubmitForm } from "@/components/exercises/ExerciseSubmitForm";
import { Dumbbell, Clock, ExternalLink } from "lucide-react";

export default async function ExercisesPage() {
  const session = await auth();

  const exercises = await db.exercise.findMany({
    where: {
      OR: [
        { status: "APPROVED" },
        { status: "PENDING", submittedById: session!.user.id },
      ],
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      categories: { select: { id: true, name: true } },
      description: true,
      demoUrl: true,
      status: true,
      submittedById: true,
    },
  });

  const approved = exercises.filter((e: any) => e.status === "APPROVED");
  const myPending = exercises.filter((e: any) => e.status === "PENDING");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Exercises</h1>

      {/* Submit form */}
      <section className="space-y-3">
        <h2 className="font-semibold">Submit a new exercise</h2>
        <p className="text-sm text-muted-foreground">
          Submitted exercises are reviewed by admins before becoming available to everyone.
        </p>
        <ExerciseSubmitForm />
      </section>

      {/* My pending */}
      {myPending.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" /> My pending submissions ({myPending.length})
          </h2>
          <div className="space-y-2">
            {myPending.map((ex: any) => (
              <div key={ex.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{ex.name}</p>
                  <p className="text-xs text-muted-foreground">{ex.categories.map((c: any) => c.name).join(", ")}</p>
                </div>
                <Badge variant="secondary" className="text-xs">Pending</Badge>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* All approved */}
      <section className="space-y-3">
        <h2 className="font-semibold">All exercises ({approved.length})</h2>
        <div className="space-y-2">
          {approved.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center space-y-2">
              <Dumbbell className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No approved exercises yet</p>
            </div>
          ) : (
            approved.map((ex: any) => (
              <div key={ex.id} className="rounded-lg border px-3 py-2.5 space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{ex.name}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    {ex.demoUrl && (
                      <a href={ex.demoUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <Badge variant="outline" className="text-xs">{ex.categories.map((c: any) => c.name).join(", ")}</Badge>
                  </div>
                </div>
                {ex.description && (
                  <p className="text-xs text-muted-foreground">{ex.description}</p>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
