import { NextResponse, type NextRequest } from "next/server";

import { getServerEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CaptadorRanking } from "@/lib/types";
import { notifyAllCaptadoresDailyRanking, notifyAllCaptadoresPrize } from "@/lib/web-push/send-captador-daily-stats";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  let serverEnv: ReturnType<typeof getServerEnv>;

  try {
    serverEnv = getServerEnv();
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const authorization = request.headers.get("authorization");
  const expected = `Bearer ${serverEnv.CRON_SECRET}`;

  if (!authorization || authorization !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const supabase = createAdminClient();

  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const { data: rawData, error: rankErr } = await supabase.rpc("get_captador_ranking", {
    period_start: startOfToday.toISOString(),
    period_end: now.toISOString(),
  });

  if (rankErr) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const top3 = ((rawData ?? []) as CaptadorRanking[])
    .filter((r) => Number(r.completed_accounts) > 0)
    .sort((a, b) => Number(b.completed_accounts) - Number(a.completed_accounts))
    .slice(0, 3)
    .map((r) => ({ name: r.name ?? "Captador", completed: Number(r.completed_accounts) }));

  if (top3.length > 0) {
    try {
      await notifyAllCaptadoresDailyRanking(top3);
    } catch (err) {
      console.error("[cron/daily-ranking] ranking push failed", err);
    }
  }

  // Check prize settings
  const { data: prizeSettings } = await supabase
    .from("app_settings")
    .select("key,value")
    .in("key", ["daily_prize_active", "daily_prize_description"]);

  const prizeActive = String((prizeSettings ?? []).find((s) => s.key === "daily_prize_active")?.value ?? "") === "true";
  const prizeDesc = String((prizeSettings ?? []).find((s) => s.key === "daily_prize_description")?.value ?? "").trim();

  if (prizeActive && prizeDesc) {
    try {
      await notifyAllCaptadoresPrize(prizeDesc);
    } catch (err) {
      console.error("[cron/daily-ranking] prize push failed", err);
    }
  }

  return NextResponse.json({ ok: true, top3Count: top3.length, prizeActive });
}
