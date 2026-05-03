export function OperadorDashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div className="h-24 rounded-2xl border border-white/[0.08] bg-white/[0.04]" key={i} />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
        <div className="h-24 rounded-2xl border border-white/[0.08] bg-white/[0.04]" />
        <div className="h-24 rounded-2xl border border-white/[0.08] bg-white/[0.04]" />
      </div>
      <div className="h-40 rounded-[2rem] border border-white/[0.08] bg-white/[0.04] p-5" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-64 rounded-2xl border border-white/[0.08] bg-white/[0.04]" />
        <div className="h-64 rounded-2xl border border-white/[0.08] bg-white/[0.04]" />
      </div>
    </div>
  );
}
