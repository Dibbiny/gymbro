import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PeopleSearch } from "@/components/people/PeopleSearch";

export default async function ExplorePage() {
  const session = await auth();

  const followingUsers = await db.follow.findMany({
    where: { followerId: session!.user.id, status: "ACCEPTED" },
    select: {
      following: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          experiencePoints: true,
          followers: {
            where: { followerId: session!.user.id },
            select: { status: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  }).then((rows) => rows.map((r) => r.following));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Explore</h1>
      <PeopleSearch initialUsers={followingUsers} />
    </div>
  );
}
