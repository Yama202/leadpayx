/**
 * Skeleton alinhado visualmente a RoleBasedLayout (sem dados reais, sem nav funcional).
 * Usado em loading.tsx por segmento (captador, operador, admin).
 */
export function SegmentRouteLoading() {
  return (
    <div className="dark relative flex min-h-dvh flex-col overflow-x-hidden bg-[#050706] text-white lg:h-dvh lg:max-h-dvh lg:overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_14%,rgba(0,224,122,0.14),transparent_28%),radial-gradient(circle_at_90%_8%,rgba(22,242,138,0.08),transparent_22%),linear-gradient(180deg,#050706_0%,#070909_54%,#030504_100%)]" />
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-45" />
      <div className="pointer-events-none absolute left-1/2 top-16 h-72 w-72 -translate-x-1/2 rounded-full bg-[#00E07A]/15 blur-[110px] sm:h-[34rem] sm:w-[34rem]" />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="ml-4 mt-4 hidden min-h-0 w-72 shrink-0 animate-pulse rounded-[2rem] border border-white/[0.08] bg-[#070909]/50 p-5 shadow-2xl shadow-black/35 backdrop-blur-xl lg:mb-4 lg:flex lg:flex-col lg:self-stretch">
          <div className="h-8 w-3/4 rounded-xl bg-white/10" />
          <div className="mt-8 space-y-2">
            {["a", "b", "c", "d", "e", "f", "g"].map((k) => (
              <div className="h-11 rounded-2xl bg-white/5" key={k} />
            ))}
          </div>
          <div className="mt-5 h-11 shrink-0 rounded-2xl bg-rose-500/10" />
        </aside>
        <main className="min-w-0 flex-1 overflow-x-hidden px-4 pb-28 pt-5 sm:px-6 lg:min-h-0 lg:overflow-y-auto lg:px-10 lg:pb-10">
          <header className="mb-7 animate-pulse rounded-[2rem] border border-white/[0.08] bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur-xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="w-full max-w-lg space-y-3">
                <div className="h-4 w-32 rounded-lg bg-white/10" />
                <div className="h-9 w-48 rounded-lg bg-white/10 sm:w-64" />
                <div className="h-4 w-full max-w-md rounded bg-white/5" />
                <div className="h-4 w-2/3 rounded bg-white/5" />
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <div className="hidden h-9 w-24 rounded-2xl bg-white/5 lg:block" />
                <div className="h-11 w-20 rounded-2xl bg-white/5" />
                <div className="h-11 w-16 rounded-2xl bg-white/5" />
              </div>
            </div>
          </header>
          <div className="space-y-4">
            <div className="h-40 animate-pulse rounded-[2rem] border border-white/[0.08] bg-white/[0.04] p-5" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {["w", "x", "y", "z"].map((k) => (
                <div
                  className="h-20 animate-pulse rounded-2xl border border-[#00E07A]/10 bg-[#00E07A]/5"
                  key={k}
                />
              ))}
            </div>
            <div className="h-32 animate-pulse rounded-[2rem] border border-white/[0.08] bg-white/[0.04]" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="h-36 animate-pulse rounded-2xl border border-white/[0.08] bg-black/20" />
              <div className="h-36 animate-pulse rounded-2xl border border-white/[0.08] bg-black/20" />
            </div>
          </div>
        </main>
      </div>
      <nav className="fixed inset-x-3 bottom-3 z-50 grid animate-pulse grid-cols-5 rounded-[1.6rem] border border-white/[0.08] bg-[#070909]/92 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl lg:hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <div className="mx-auto h-10 w-14 rounded-2xl bg-white/5" key={i} />
        ))}
      </nav>
    </div>
  );
}
