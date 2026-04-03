import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { LogoutButton } from "@/components/profile/LogoutButton";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";

export default async function ProfileEditPage() {
  const session = await auth();

  const user = await db.user.findUnique({
    where: { id: session!.user.id },
    select: { username: true, bio: true, avatarUrl: true },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link href={`/profile/${user!.username}`} className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Edit Profile</h1>
      </div>
      <ProfileEditForm user={user!} />
      <Separator />
      <LogoutButton />
    </div>
  );
}
