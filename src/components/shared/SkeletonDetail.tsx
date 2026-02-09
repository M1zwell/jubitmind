export function SkeletonDetail() {
  return (
    <div className="mt-1 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg p-3 animate-pulse">
      <div className="h-12 w-full rounded bg-[var(--color-bg-secondary)] mb-3" />
      <div className="space-y-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-6 w-full rounded bg-[var(--color-bg-secondary)]" />
        ))}
      </div>
    </div>
  );
}
