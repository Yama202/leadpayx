/** Fallback para Suspense no dashboard do captador (estrutura sem dados). */
export function CaptadorDashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-14 rounded-2xl border border-white/[0.08] bg-white/[0.06]" />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div className="min-h-[4.5rem] rounded-2xl border border-[#00E07A]/15 bg-[#00E07A]/5" key={i} />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div className="h-24 rounded-2xl border border-white/[0.08] bg-white/[0.04]" key={i} />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="h-48 rounded-2xl border border-white/[0.08] bg-white/[0.04]" />
          <div className="h-48 rounded-2xl border border-white/[0.08] bg-white/[0.04]" />
        </div>
        <div className="h-80 rounded-[2rem] border border-white/[0.08] bg-white/[0.04]" />
      </div>
    </div>
  );
}
