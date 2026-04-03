import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { TopBar } from "./TopBar";

export async function TopBarWrapper() {
  const session = await auth();

  const pendingCount = session
    ? await db.follow.count({
        where: { followingId: session.user.id, status: "PENDING" },
      })
    : 0;

  return <TopBar pendingNotifications={pendingCount} />;
}
