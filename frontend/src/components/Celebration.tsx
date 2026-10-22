// burst counts successful purchases; each new value replays the animation
export function Celebration({ burst }: { burst: number }) {
  if (burst === 0) return null;
  return (
    <div
      key={burst}
      aria-hidden="true"
      data-celebration
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
    >
      <div className="relative h-24 w-48">
        <span className="cheers-cup cheers-cup-left absolute top-6 left-1/2 text-6xl">☕</span>
        <span className="cheers-cup cheers-cup-right absolute top-6 left-1/2 text-6xl">☕</span>
        <span className="cheers-spark absolute -top-4 left-1/2 text-2xl font-bold text-amber-700 dark:text-amber-300">
          ✨ 짠! ✨
        </span>
      </div>
    </div>
  );
}
