export default function PlansLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex gap-2">
        <div className="h-8 w-16 rounded-full bg-muted" />
        <div className="h-8 w-16 rounded-full bg-muted" />
      </div>
      <div className="space-y-3">
        <div className="h-4 w-24 rounded bg-muted" />
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl border p-4 space-y-2">
            <div className="h-4 w-40 rounded bg-muted" />
            <div className="h-3 w-28 rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <div className="h-4 w-32 rounded bg-muted" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border p-4 space-y-2">
            <div className="h-4 w-48 rounded bg-muted" />
            <div className="h-3 w-32 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
