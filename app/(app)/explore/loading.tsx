export default function ExploreLoading() {
  return (
    <div className="space-y-4">
      <div className="h-9 w-full rounded-lg bg-muted animate-pulse" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border p-3 animate-pulse">
            <div className="h-10 w-10 rounded-full bg-muted shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-24 rounded bg-muted" />
              <div className="h-2.5 w-16 rounded bg-muted" />
            </div>
            <div className="h-8 w-20 rounded-lg bg-muted shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
