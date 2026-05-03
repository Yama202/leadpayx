/** Feedback imediato ao navegar para /login (evita ecrã parado). */
export default function LoginLoading() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-pulse rounded-[2rem] border border-white/[0.08] bg-white/[0.04] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl dark:bg-[#070909]/80">
        <div className="mx-auto h-6 w-48 rounded-lg bg-white/10" />
        <div className="mx-auto mt-2 h-4 w-full max-w-xs rounded bg-white/5" />
        <div className="mt-8 space-y-4">
          <div className="h-12 w-full rounded-2xl bg-white/5" />
          <div className="h-12 w-full rounded-2xl bg-white/5" />
          <div className="h-12 w-full rounded-2xl bg-[#00E07A]/20" />
        </div>
      </div>
    </div>
  );
}
