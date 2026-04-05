export default function AdminExercisesLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Section title placeholder */}
      <div className="h-6 w-40 rounded bg-muted" />

      {/* Search bar placeholder */}
      <div className="h-9 w-full rounded-lg bg-muted" />

      {/* Exercise row placeholders */}
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border p-3">
          <div className="h-4 w-2/5 rounded bg-muted" />
          <div className="h-3 w-1/4 rounded bg-muted" />
          <div className="ml-auto h-7 w-16 rounded-lg bg-muted" />
        </div>
      ))}
    </div>
  );
}
