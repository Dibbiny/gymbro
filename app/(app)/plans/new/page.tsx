import { NewPlanClient } from "@/components/plans/NewPlanClient";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function NewPlanPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/plans" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Create Plan</h1>
      </div>
      <NewPlanClient />
    </div>
  );
}
