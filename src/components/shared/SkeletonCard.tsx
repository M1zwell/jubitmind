export function SkeletonCard() {
  return (
    <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-3 animate-pulse">
      <div className="flex items-center gap-1.5 mb-2">
        <div className="h-4 w-14 rounded bg-[var(--color-bg-tertiary)]" />
        <div className="h-4 w-4 rounded bg-[var(--color-bg-tertiary)]" />
      </div>
      <div className="h-4 w-3/4 rounded bg-[var(--color-bg-tertiary)] mb-1" />
      <div className="h-3 w-full rounded bg-[var(--color-bg-tertiary)] mb-1" />
      <div className="h-3 w-2/3 rounded bg-[var(--color-bg-tertiary)] mb-2" />
      <div className="flex gap-3">
        <div className="h-3 w-8 rounded bg-[var(--color-bg-tertiary)]" />
        <div className="h-3 w-12 rounded bg-[var(--color-bg-tertiary)]" />
        <div className="h-3 w-16 rounded bg-[var(--color-bg-tertiary)]" />
      </div>
    </div>
  );
}
