export default function ProfileEditLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Large centered avatar circle */}
      <div className="flex justify-center pt-2">
        <div className="h-24 w-24 rounded-full bg-muted" />
      </div>

      {/* Bio textarea placeholder */}
      <div className="space-y-2">
        <div className="h-3 w-10 rounded bg-muted" />
        <div className="h-24 w-full rounded-lg bg-muted" />
      </div>

      {/* Save button placeholder */}
      <div className="h-10 w-full rounded-lg bg-muted" />
    </div>
  );
}
