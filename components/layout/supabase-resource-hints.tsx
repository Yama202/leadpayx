/**
 * Preconnect ao host do Supabase (auth + realtime) para reduzir latência TLS na 1ª request —
 * bom para PSI "reduce unused latency" nos fluxos com sessão.
 */
export function SupabaseResourceHints() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return null;

  let origin: string;
  try {
    origin = new URL(raw).origin;
  } catch {
    return null;
  }

  return (
    <>
      <link crossOrigin="anonymous" href={origin} rel="preconnect" />
      <link href={origin} rel="dns-prefetch" />
    </>
  );
}
