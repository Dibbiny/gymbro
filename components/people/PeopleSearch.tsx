"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, User } from "lucide-react";
import { FollowButton } from "@/components/social/FollowButton";
import { xpToLevel } from "@/lib/xp";

interface UserResult {
  id: string;
  username: string;
  avatarUrl: string | null;
  experiencePoints: number;
  followers: { status: string }[];
}

interface Props {
  initialUsers: UserResult[];
}

export function PeopleSearch({ initialUsers }: Props) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setSearchResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/users?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setSearchResults(data.users ?? []);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const users = query.trim() ? searchResults : initialUsers;
  const isEmpty = !loading && users.length === 0;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Search by username…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-xl border border-border bg-muted/40 pl-9 pr-4 py-2.5 text-sm outline-none focus:border-primary focus:bg-background transition-colors"
        />
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground text-center py-4">Searching…</p>
      )}

      {!loading && isEmpty && query && (
        <p className="text-sm text-muted-foreground text-center py-8">No users found for "{query}"</p>
      )}

      {!loading && isEmpty && !query && (
        <div className="text-center py-8 space-y-2">
          <User className="h-8 w-8 mx-auto opacity-30" />
          <p className="text-sm text-muted-foreground">You're not following anyone yet</p>
        </div>
      )}

      {!loading && (
        <div className="space-y-2">
          {users.map((user) => {
            const followStatus = user.followers[0]?.status ?? null;
            const { level } = xpToLevel(user.experiencePoints);
            return (
              <div key={user.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <Link href={`/profile/${user.username}`} className="flex-1 flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.username} className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">@{user.username}</p>
                    <p className="text-xs text-muted-foreground">Level {level}</p>
                  </div>
                </Link>
                <FollowButton targetUserId={user.id} initialStatus={followStatus} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
