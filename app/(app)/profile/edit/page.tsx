import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { LogoutButton } from "@/components/profile/LogoutButton";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { Dumbbell } from "lucide-react";

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
      <Link
        href="/exercises"
        className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
      >
        <Dumbbell className="h-4 w-4" />
        Submit an exercise
      </Link>
      <Separator />
      <LogoutButton />
    </div>
  );
}
