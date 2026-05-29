import { createClient } from "@/lib/supabase/server";
import type { CaptadorRanking } from "@/lib/types";

function startOfWeek(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

const POSITION_STYLE: Record<number, { icon: string; bg: string; border: string; text: string; count: string }> = {
  1: {
    icon: "🥇",
    bg: "bg-gradient-to-br from-amber-400/15 to-amber-600/8",
    border: "border-amber-400/30",
    text: "text-amber-100",
    count: "text-amber-300",
  },
  2: {
    icon: "🥈",
    bg: "bg-gradient-to-br from-slate-400/12 to-slate-600/6",
    border: "border-slate-400/25",
    text: "text-slate-200",
    count: "text-slate-300",
  },
  3: {
    icon: "🥉",
    bg: "bg-gradient-to-br from-orange-800/12 to-orange-900/6",
    border: "border-orange-700/25",
    text: "text-orange-200",
    count: "text-orange-400",
  },
};

export async function CaptadorRankBadge({ profileId }: { profileId: string }) {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: rawData } = await supabase
    .rpc("get_captador_ranking", { period_start: startOfWeek().toISOString(), period_end: now });

  const sorted = [...((rawData ?? []) as CaptadorRanking[])]
    .filter((r) => Number(r.completed_accounts) > 0)
    .sort((a, b) => Number(b.completed_accounts) - Number(a.completed_accounts));

  const position = sorted.findIndex((r) => r.captador_id === profileId) + 1;
  const myRow = sorted.find((r) => r.captador_id === profileId);

  if (!myRow || position === 0) {
    return (
      <div className="rounded-[2rem] border border-white/[0.08] bg-white/[0.04] px-5 py-4 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-zinc-500">Ranking semanal</p>
        <p className="mt-1 text-sm text-zinc-500">Conclua contas esta semana para entrar no ranking.</p>
      </div>
    );
  }

  const style = POSITION_STYLE[position] ?? {
    icon: `#${position}`,
    bg: "bg-white/[0.04]",
    border: "border-white/[0.08]",
    text: "text-zinc-200",
    count: "text-[#16F28A]",
  };

  const total = sorted.length;
  const completed = Number(myRow.completed_accounts);

  return (
    <div className={`rounded-[2rem] border px-5 py-4 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl ${style.bg} ${style.border}`}>
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-zinc-500">Seu ranking esta semana</p>
      <div className="mt-2 flex items-center gap-3">
        <span className="text-3xl">{style.icon}</span>
        <div>
          <p className={`text-2xl font-black ${style.text}`}>
            {position}º lugar
          </p>
          <p className={`text-xs font-bold ${style.count}`}>
            {completed} conta{completed !== 1 ? "s" : ""} concluída{completed !== 1 ? "s" : ""} · de {total} captador{total !== 1 ? "es" : ""}
          </p>
        </div>
      </div>
      {position <= 3 ? (
        <p className="mt-2 text-xs text-zinc-500">
          Você está no pódio! Continue assim.
        </p>
      ) : (
        <p className="mt-2 text-xs text-zinc-500">
          Mais {completed > 0 ? `${Number(sorted[position - 2]?.completed_accounts ?? 0) - completed + 1} conta(s)` : "contas"} para subir uma posição.
        </p>
      )}
    </div>
  );
}
