export default function PlanDetailLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Header row: back chevron + title */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-muted" />
        <div className="h-5 w-48 rounded bg-muted" />
      </div>

      {/* Meta badge placeholders */}
      <div className="flex gap-2">
        <div className="h-6 w-20 rounded-full bg-muted" />
        <div className="h-6 w-24 rounded-full bg-muted" />
      </div>

      {/* Description placeholder (2 lines) */}
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-3/4 rounded bg-muted" />
      </div>

      {/* Enroll button placeholder */}
      <div className="h-10 w-full rounded-lg bg-muted" />

      {/* Separator */}
      <div className="h-px w-full rounded bg-muted" />

      {/* Exercise card placeholders */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border p-4 space-y-3">
          <div className="h-4 w-36 rounded bg-muted" />
          {[1, 2, 3].map((j) => (
            <div key={j} className="flex items-center gap-3">
              <div className="h-3 w-3/5 rounded bg-muted" />
              <div className="h-3 w-1/4 rounded bg-muted" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
