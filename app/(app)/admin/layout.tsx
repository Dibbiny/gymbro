import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Shield, Dumbbell, Users, Megaphone, ClipboardList, FileText } from "lucide-react";

const adminNav = [
  { href: "/admin/exercises", label: "Exercises", icon: Dumbbell },
  { href: "/admin/plans", label: "Plans", icon: ClipboardList },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/posts", label: "Posts", icon: FileText },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/feed");

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-bold">Admin Panel</h1>
      </div>

      <div className="flex gap-2 border-b border-border pb-3 overflow-x-auto">
        {adminNav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </div>

      {children}
    </div>
  );
}
