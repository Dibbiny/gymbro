import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/nav/BottomNav";
import { TopBarWrapper } from "@/components/nav/TopBarWrapper";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="flex flex-col min-h-screen">
      <TopBarWrapper />
      <main className="flex-1 mx-auto w-full max-w-lg px-4 py-4 pb-24">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
