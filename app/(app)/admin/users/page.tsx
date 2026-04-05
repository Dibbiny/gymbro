import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { xpToLevel } from "@/lib/xp";
import { UserRoleToggle } from "@/components/admin/UserRoleToggle";
import { UserDeleteButton } from "@/components/admin/UserDeleteButton";
import { auth } from "@/lib/auth";

export default async function AdminUsersPage() {
  const session = await auth();

  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      email: true,
      avatarUrl: true,
      role: true,
      experiencePoints: true,
      createdAt: true,
      _count: {
        select: {
          trainingSessions: { where: { completedAt: { not: null } } },
          posts: true,
        },
      },
    },
  });

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{users.length} users total</p>
      <div className="space-y-2">
        {users.map((user: any) => {
          const { level } = xpToLevel(user.experiencePoints);
          const isSelf = user.id === session!.user.id;
          return (
            <div key={user.id} className="rounded-xl border p-3.5 space-y-2">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={user.avatarUrl ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {user.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">@{user.username}</p>
                    <Badge variant={user.role === "ADMIN" ? "default" : "secondary"} className="text-[10px] shrink-0">
                      {user.role}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                {!isSelf && (
                  <div className="flex gap-1.5 shrink-0">
                    <UserRoleToggle userId={user.id} currentRole={user.role} />
                    <UserDeleteButton userId={user.id} username={user.username} />
                  </div>
                )}
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>Lv {level}</span>
                <span>{user.experiencePoints} XP</span>
                <span>{user._count.trainingSessions} sessions</span>
                <span>{user._count.posts} posts</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
