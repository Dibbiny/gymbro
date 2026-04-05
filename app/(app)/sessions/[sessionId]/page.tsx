import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Dumbbell, Clock } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "@/lib/time";
import { DeleteSessionButton } from "@/components/training/DeleteSessionButton";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

interface Props {
  params: Promise<{ sessionId: string }>;
}

export default async function SessionDetailPage({ params }: Props) {
  const authSession = await auth();
  const { sessionId } = await params;

  const session = await db.trainingSession.findUnique({
    where: { id: sessionId, completedAt: { not: null } },
    include: {
      user: { select: { id: true, username: true } },
      planDay: {
        include: {
          plan: { select: { title: true } },
          planDayExercises: {
            orderBy: { orderIndex: "asc" },
            include: { exercise: { select: { id: true, name: true, categories: { select: { name: true } } } } },
          },
        },
      },
      setLogs: {
        orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }],
        include: { exercise: { select: { id: true, name: true, categories: { select: { name: true } } } } },
      },
    },
  });

  if (!session) notFound();

  // Only owner or followers of the owner can view
  const isOwner = authSession!.user.id === session.userId;
  if (!isOwner) {
    const follow = await db.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: authSession!.user.id,
          followingId: session.userId,
        },
      },
    });
    if (!follow || follow.status !== "ACCEPTED") notFound();
  }

  // Group set logs by exercise
  const byExercise = new Map<string, typeof session.setLogs>();
  for (const log of session.setLogs) {
    if (!byExercise.has(log.exerciseId)) byExercise.set(log.exerciseId, []);
    byExercise.get(log.exerciseId)!.push(log);
  }

  const duration = Math.floor(
    (new Date(session.completedAt!).getTime() - new Date(session.startedAt).getTime()) / 1000 -
      session.pausedDuration
  );

  let isRandomDay = false;
  try {
    if (session.notes) isRandomDay = JSON.parse(session.notes)?.randomDay === true;
  } catch {}

  const dayLabel = isRandomDay
    ? "Random Day"
    : session.planDay?.label ?? (session.planDay ? DAY_NAMES[session.planDay.dayOfWeek] : "Workout");

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href="/history" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{dayLabel}</h1>
          {session.planDay?.plan && (
            <p className="text-sm text-muted-foreground">{session.planDay.plan.title}</p>
          )}
        </div>
        {isOwner && <DeleteSessionButton sessionId={sessionId} />}
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1">
          <Dumbbell className="h-4 w-4" />
          @{session.user.username}
        </span>
        <span>{formatDistanceToNow(new Date(session.completedAt!))}</span>
        {duration > 60 && (
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatDuration(duration)}
          </span>
        )}
        <Badge variant="secondary">{session.setLogs.length} sets</Badge>
      </div>

      {/* Exercises */}
      <div className="space-y-3">
        {Array.from(byExercise.entries()).map(([exerciseId, logs]) => {
          const exercise = logs[0].exercise;
          return (
            <div key={exerciseId} className="rounded-xl border p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">{exercise.name}</p>
                <Badge variant="outline" className="text-xs">
                  {exercise.categories.map((c) => c.name).join(", ")}
                </Badge>
              </div>
              <div className="space-y-1">
                {logs.map((log) => (
                  <div key={log.id} className="space-y-0.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground text-xs">Set {log.setNumber}</span>
                      <span className="font-medium">
                        {log.weightKg ? `${log.weightKg} kg` : "BW"} × {log.repsCompleted} reps
                      </span>
                    </div>
                    {log.notes && (
                      <p className="text-xs text-muted-foreground italic pl-1">💬 {log.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {byExercise.size === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No sets logged</p>
        )}
      </div>
    </div>
  );
}
