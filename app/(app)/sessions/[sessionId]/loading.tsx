export default function SessionLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 rounded bg-muted" />
        <div className="h-6 w-40 rounded bg-muted" />
      </div>
      <div className="flex gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-5 w-20 rounded bg-muted" />
        ))}
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="h-5 w-16 rounded-full bg-muted" />
          </div>
          {[1, 2, 3].map((j) => (
            <div key={j} className="flex items-center justify-between">
              <div className="h-3 w-10 rounded bg-muted" />
              <div className="h-3 w-24 rounded bg-muted" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
