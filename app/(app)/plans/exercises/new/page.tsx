import { ExerciseSubmitForm } from "@/components/exercises/ExerciseSubmitForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewExercisePage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/plans?tab=exercises"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Exercises
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-bold">Submit an exercise</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Exercises are reviewed before appearing in the library.
        </p>
      </div>

      <ExerciseSubmitForm redirectOnSuccess="/plans?tab=exercises" />
    </div>
  );
}
