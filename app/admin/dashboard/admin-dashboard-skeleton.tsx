export function AdminDashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div className="h-24 rounded-2xl border border-white/[0.08] bg-white/[0.04] dark:border-white/10" key={i} />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-24 rounded-2xl border border-white/[0.08] bg-white/[0.04]" />
        <div className="h-24 rounded-2xl border border-white/[0.08] bg-white/[0.04]" />
      </div>
      <div className="h-64 rounded-[2rem] border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/5" />
      <div className="h-64 rounded-[2rem] border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/5" />
    </div>
  );
}
