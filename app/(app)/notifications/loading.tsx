export default function NotificationsLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Title placeholder */}
      <div className="h-6 w-36 rounded bg-muted" />

      {/* Notification row placeholders */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-3 rounded-xl border p-4">
          {/* Avatar circle */}
          <div className="h-10 w-10 shrink-0 rounded-full bg-muted" />

          <div className="flex-1 space-y-2">
            {/* Text lines */}
            <div className="h-3 w-full rounded bg-muted" />
            <div className="h-3 w-4/5 rounded bg-muted" />

            {/* Small button placeholders */}
            <div className="flex gap-2 pt-1">
              <div className="h-7 w-16 rounded-lg bg-muted" />
              <div className="h-7 w-16 rounded-lg bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
