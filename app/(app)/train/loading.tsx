export default function TrainLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-7 w-20 rounded bg-muted" />
      <div className="rounded-xl border p-4 space-y-3">
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="h-10 w-full rounded-lg bg-muted" />
      </div>
      <div className="space-y-3">
        <div className="h-4 w-28 rounded bg-muted" />
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl border p-4 space-y-2">
            <div className="h-4 w-40 rounded bg-muted" />
            <div className="h-3 w-24 rounded bg-muted" />
            <div className="h-9 w-full rounded-lg bg-muted mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
