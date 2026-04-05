import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FollowRequestActions } from "@/components/social/FollowRequestActions";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "@/lib/time";

export default async function NotificationsPage() {
  const session = await auth();

  const pendingRequests = await db.follow.findMany({
    where: { followingId: session!.user.id, status: "PENDING" },
    include: {
      follower: { select: { id: true, username: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Notifications</h1>

      {pendingRequests.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center space-y-2">
          <Bell className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No pending follow requests</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground font-medium">
            Follow requests ({pendingRequests.length})
          </p>
          {pendingRequests.map((req: any) => (
            <div
              key={req.id}
              className="flex items-center justify-between gap-3 rounded-xl border p-3"
            >
              <div className="flex items-center gap-2.5">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={req.follower.avatarUrl ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {req.follower.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold">@{req.follower.username}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(req.createdAt))}
                  </p>
                </div>
              </div>
              <FollowRequestActions followerId={req.follower.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
