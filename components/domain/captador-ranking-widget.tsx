import { createClient } from "@/lib/supabase/server";
import type { CaptadorRanking } from "@/lib/types";

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function startOfWeekUtc(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff));
}

const MEDALS = ["🥇", "🥈", "🥉"];

const POSITION_STYLE: Record<number, { bg: string; border: string; text: string; count: string }> = {
  1: {
    bg: "bg-gradient-to-br from-amber-400/15 to-amber-600/8",
    border: "border-amber-400/30",
    text: "text-amber-100",
    count: "text-amber-300",
  },
  2: {
    bg: "bg-gradient-to-br from-slate-400/12 to-slate-600/6",
    border: "border-slate-400/25",
    text: "text-slate-200",
    count: "text-slate-300",
  },
  3: {
    bg: "bg-gradient-to-br from-orange-800/12 to-orange-900/6",
    border: "border-orange-700/25",
    text: "text-orange-200",
    count: "text-orange-400",
  },
};

export async function CaptadorRankingWidget({ profileId }: { profileId: string }) {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const todayStart = startOfTodayUtc().toISOString();
  const weekStart = startOfWeekUtc().toISOString();

  const [todayRes, weekRes, settingsRes] = await Promise.all([
    supabase.rpc("get_captador_ranking", { period_start: todayStart, period_end: now }),
    supabase.rpc("get_captador_ranking", { period_start: weekStart, period_end: now }),
    supabase.from("app_settings").select("key,value").in("key", ["daily_prize_active", "daily_prize_description"]),
  ]);

  const settings = settingsRes.data ?? [];
  const prizeActive = String(settings.find((s) => s.key === "daily_prize_active")?.value ?? "") === "true";
  const prizeDesc = String(settings.find((s) => s.key === "daily_prize_description")?.value ?? "").trim();

  const todayRanking = ((todayRes.data ?? []) as CaptadorRanking[])
    .filter((r) => Number(r.completed_accounts) > 0)
    .sort((a, b) => Number(b.completed_accounts) - Number(a.completed_accounts));

  const weekRanking = ((weekRes.data ?? []) as CaptadorRanking[])
    .filter((r) => Number(r.completed_accounts) > 0)
    .sort((a, b) => Number(b.completed_accounts) - Number(a.completed_accounts));

  const myWeekPos = weekRanking.findIndex((r) => r.captador_id === profileId) + 1;
  const myWeekRow = weekRanking.find((r) => r.captador_id === profileId);
  const myWeekCompleted = myWeekRow ? Number(myWeekRow.completed_accounts) : 0;

  const todayTop3 = todayRanking.slice(0, 3);
  const weekTop3 = weekRanking.slice(0, 3);

  return (
    <div className="space-y-3">
      {/* Prize banner */}
      {prizeActive && prizeDesc ? (
        <div className="rounded-[2rem] border border-emerald-400/40 bg-gradient-to-br from-emerald-500/20 to-amber-500/10 px-5 py-4 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-400">Prêmio de hoje</p>
          <p className="mt-1 text-base font-black text-white">🎁 {prizeDesc}</p>
          <p className="mt-1 text-xs font-semibold text-emerald-300">Quem trouxer mais contas hoje ganha!</p>
        </div>
      ) : null}

      {/* Ranking columns */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Today ranking */}
        <div className="rounded-[2rem] border border-white/[0.08] bg-white/[0.04] px-5 py-4 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-zinc-500">Hoje</p>
          {todayTop3.length === 0 ? (
            <p className="mt-2 text-xs text-zinc-500">Nenhuma conta concluída ainda hoje.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {todayTop3.map((r, i) => {
                const style = POSITION_STYLE[i + 1] ?? {
                  bg: "",
                  border: "",
                  text: "text-zinc-200",
                  count: "text-[#16F28A]",
                };
                const completed = Number(r.completed_accounts);
                return (
                  <li className={`flex items-center gap-2 rounded-2xl border px-3 py-2 ${style.bg} ${style.border}`} key={r.captador_id}>
                    <span className="text-lg">{MEDALS[i]}</span>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-black ${style.text}`}>{r.name ?? "—"}</p>
                      <p className={`text-xs font-bold ${style.count}`}>
                        {completed} conta{completed !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Week ranking */}
        <div className="rounded-[2rem] border border-white/[0.08] bg-white/[0.04] px-5 py-4 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-zinc-500">Esta semana</p>
          {weekTop3.length === 0 ? (
            <p className="mt-2 text-xs text-zinc-500">Nenhuma conta concluída esta semana.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {weekTop3.map((r, i) => {
                const style = POSITION_STYLE[i + 1] ?? {
                  bg: "",
                  border: "",
                  text: "text-zinc-200",
                  count: "text-[#16F28A]",
                };
                const completed = Number(r.completed_accounts);
                return (
                  <li className={`flex items-center gap-2 rounded-2xl border px-3 py-2 ${style.bg} ${style.border}`} key={r.captador_id}>
                    <span className="text-lg">{MEDALS[i]}</span>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-black ${style.text}`}>{r.name ?? "—"}</p>
                      <p className={`text-xs font-bold ${style.count}`}>
                        {completed} conta{completed !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Your position */}
      {myWeekRow ? (
        <div className={`rounded-[2rem] border px-5 py-4 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl ${
          myWeekPos >= 1 && myWeekPos <= 3
            ? (POSITION_STYLE[myWeekPos]?.bg ?? "") + " " + (POSITION_STYLE[myWeekPos]?.border ?? "")
            : "border-white/[0.08] bg-white/[0.04]"
        }`}>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-zinc-500">Sua posição</p>
          <p className="mt-1 text-sm font-bold text-zinc-200">
            {myWeekPos <= 3 && myWeekPos >= 1 ? `${MEDALS[myWeekPos - 1]} ` : ""}
            #{myWeekPos} lugar esta semana · {myWeekCompleted} conta{myWeekCompleted !== 1 ? "s" : ""} concluída{myWeekCompleted !== 1 ? "s" : ""}
          </p>
        </div>
      ) : (
        <div className="rounded-[2rem] border border-white/[0.08] bg-white/[0.04] px-5 py-4 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-zinc-500">Sua posição</p>
          <p className="mt-1 text-sm text-zinc-500">Conclua contas esta semana para entrar no ranking.</p>
        </div>
      )}
    </div>
  );
}
