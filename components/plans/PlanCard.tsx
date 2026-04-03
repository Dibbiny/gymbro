import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StarRating } from "./StarRating";
import { Calendar, Clock, Users } from "lucide-react";

interface PlanCardProps {
  plan: {
    id: string;
    title: string;
    description: string | null;
    durationWeeks: number;
    visibility: string;
    starRatingSum: number;
    starRatingCount: number;
    creator: { username: string; avatarUrl: string | null };
    _count: { planEnrollments: number };
  };
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function PlanCard({ plan }: PlanCardProps) {
  const avgRating =
    plan.starRatingCount > 0
      ? Math.round((plan.starRatingSum / plan.starRatingCount) * 10) / 10
      : 0;

  return (
    <Link href={`/plans/${plan.id}`} className="block">
      <Card className="hover:shadow-md transition-shadow active:scale-[0.99]">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-base leading-tight line-clamp-2">{plan.title}</h3>
            <Badge variant="secondary" className="shrink-0 text-xs">
              {plan.visibility === "PUBLIC" ? "Public" : "Private"}
            </Badge>
          </div>
          {plan.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {plan.description}
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {plan.durationWeeks}w
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {plan._count.planEnrollments}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <StarRating value={Math.round(avgRating)} readonly size="sm" />
              <span className="text-xs text-muted-foreground">
                {avgRating > 0 ? `${avgRating} (${plan.starRatingCount})` : "No ratings"}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Avatar className="h-5 w-5">
                <AvatarImage src={plan.creator.avatarUrl ?? undefined} />
                <AvatarFallback className="text-[10px]">
                  {plan.creator.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">@{plan.creator.username}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
