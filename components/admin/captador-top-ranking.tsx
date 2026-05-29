import { createClient } from "@/lib/supabase/server";
import type { CaptadorRanking } from "@/lib/types";

const MEDALS = [
  {
    icon: "🥇",
    label: "1º",
    ring: "ring-amber-400/40",
    bg: "bg-gradient-to-br from-amber-400/20 to-amber-600/10",
    border: "border-amber-400/30",
    badge: "bg-amber-400 text-amber-950",
    name: "text-amber-100",
    glow: "shadow-[0_0_32px_rgba(251,191,36,0.15)]",
    countColor: "text-amber-300",
    size: "text-base",
  },
  {
    icon: "🥈",
    label: "2º",
    ring: "ring-slate-400/30",
    bg: "bg-gradient-to-br from-slate-400/15 to-slate-600/8",
    border: "border-slate-400/25",
    badge: "bg-slate-300 text-slate-900",
    name: "text-slate-200",
    glow: "",
    countColor: "text-slate-300",
    size: "text-sm",
  },
  {
    icon: "🥉",
    label: "3º",
    ring: "ring-orange-700/30",
    bg: "bg-gradient-to-br from-orange-800/15 to-orange-900/8",
    border: "border-orange-700/25",
    badge: "bg-orange-700 text-orange-100",
    name: "text-orange-200",
    glow: "",
    countColor: "text-orange-400",
    size: "text-sm",
  },
];

function RankingSection({
  title,
  subtitle,
  rows,
  emptyMsg,
}: {
  title: string;
  subtitle: string;
  rows: CaptadorRanking[];
  emptyMsg: string;
}) {
  return (
    <div className="flex-1 min-w-0">
      <div className="mb-4">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-500">{subtitle}</p>
        <p className="mt-0.5 text-lg font-black text-white">{title}</p>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.08] px-4 py-6 text-center text-xs text-zinc-600">
          {emptyMsg}
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row, i) => {
            const m = MEDALS[i]!;
            return (
              <div
                className={`relative flex items-center gap-3 overflow-hidden rounded-2xl border px-4 py-3.5 ring-1 ${m.bg} ${m.border} ${m.ring} ${m.glow}`}
                key={row.captador_id}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg font-black ${m.badge}`}>
                  {m.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`truncate font-black ${m.name} ${m.size}`}>
                    {row.name?.trim() || row.email || "—"}
                  </p>
                  <p className={`text-xs font-bold ${m.countColor}`}>
                    {row.completed_accounts} conta{row.completed_accounts !== 1 ? "s" : ""} concluída{row.completed_accounts !== 1 ? "s" : ""}
                  </p>
                </div>
                <span className={`shrink-0 text-[11px] font-black ${m.countColor} opacity-50`}>{m.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function startOfDay(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // segunda-feira
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function top3(rows: CaptadorRanking[]): CaptadorRanking[] {
  return [...rows]
    .filter((r) => r.completed_accounts > 0)
    .sort((a, b) => Number(b.completed_accounts) - Number(a.completed_accounts))
    .slice(0, 3);
}

export async function CaptadorTopRanking() {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const [todayRes, weekRes] = await Promise.all([
    supabase.rpc("get_captador_ranking", { period_start: startOfDay().toISOString(), period_end: now }),
    supabase.rpc("get_captador_ranking", { period_start: startOfWeek().toISOString(), period_end: now }),
  ]);

  const todayTop = top3((todayRes.data ?? []) as CaptadorRanking[]);
  const weekTop = top3((weekRes.data ?? []) as CaptadorRanking[]);

  return (
    <section className="mt-6 rounded-[2rem] border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-black/20 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div className="mb-6 flex items-center gap-3">
        <span className="text-2xl">🏆</span>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-500">Premiação</p>
          <p className="text-lg font-black text-white">Top captadores</p>
        </div>
      </div>
      <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
        <RankingSection
          emptyMsg="Nenhuma conta concluída hoje ainda."
          rows={todayTop}
          subtitle="Período"
          title="Hoje"
        />
        <div className="hidden sm:block w-px bg-white/[0.06]" />
        <RankingSection
          emptyMsg="Nenhuma conta concluída esta semana ainda."
          rows={weekTop}
          subtitle="Período"
          title="Esta semana"
        />
      </div>
    </section>
  );
}
