"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSession } from "next-auth/react";

const pageTitles: Record<string, string> = {
  "/feed": "Gymbro",
  "/train": "Train",
  "/plans": "Plans",
  "/progress": "Progress",
  "/profile": "Profile",
  "/history": "History",
};

function getTitle(pathname: string): string {
  for (const [key, title] of Object.entries(pageTitles)) {
    if (pathname === key || pathname.startsWith(key + "/")) return title;
  }
  return "Gymbro";
}

export function TopBar({ pendingNotifications = 0 }: { pendingNotifications?: number }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const title = getTitle(pathname);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto max-w-lg flex items-center justify-between px-4 h-14">
        <span className="text-lg font-bold tracking-tight">{title}</span>
        <div className="flex items-center gap-2">
          <Link
            href="/notifications"
            aria-label="Notifications"
            className="relative inline-flex items-center justify-center size-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Bell className="h-5 w-5" />
            {pendingNotifications > 0 && (
              <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                {pendingNotifications > 9 ? "9+" : pendingNotifications}
              </span>
            )}
          </Link>
          <Link href="/profile" aria-label="Profile">
            <Avatar className="h-8 w-8">
              <AvatarImage src={session?.user?.avatarUrl ?? undefined} />
              <AvatarFallback className="text-xs font-semibold">
                {session?.user?.username?.slice(0, 2).toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>
    </header>
  );
}
