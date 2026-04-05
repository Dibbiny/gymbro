import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDistanceToNow } from "@/lib/time";
import { Badge } from "@/components/ui/badge";
import { AnnouncementForm } from "@/components/admin/AnnouncementForm";
import { AnnouncementToggle } from "@/components/admin/AnnouncementToggle";

export default async function AdminAnnouncementsPage() {
  const session = await auth();

  const announcements = await db.announcement.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { username: true } } },
  });

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="font-semibold">New Announcement</h2>
        <AnnouncementForm adminId={session!.user.id} />
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">All Announcements</h2>
        {announcements.length === 0 ? (
          <p className="text-sm text-muted-foreground">No announcements yet.</p>
        ) : (
          <div className="space-y-2">
            {announcements.map((a: any) => (
              <div key={a.id} className="rounded-xl border p-3.5 space-y-1.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">{a.title}</p>
                      <Badge variant={a.isActive ? "default" : "secondary"} className="text-[10px] shrink-0">
                        {a.isActive ? "Active" : "Hidden"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.body}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      by @{a.createdBy.username} · {formatDistanceToNow(new Date(a.createdAt))}
                    </p>
                  </div>
                  <AnnouncementToggle announcementId={a.id} isActive={a.isActive} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
