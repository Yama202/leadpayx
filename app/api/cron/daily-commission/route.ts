import { NextResponse, type NextRequest } from "next/server";

import { getServerEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyCaptadorDailyCommission } from "@/lib/web-push/send-captador-daily-stats";

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

  // All captadores with at least one active push subscription
  const { data: captadores, error: captadoresErr } = await supabase
    .from("captador_web_push_subscriptions")
    .select("user_id")
    .returns<{ user_id: string }[]>();

  if (captadoresErr) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const uniqueIds = [...new Set((captadores ?? []).map((r) => r.user_id))];

  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const startOfTodayIso = startOfToday.toISOString();
  const nowIso = now.toISOString();

  let notified = 0;

  for (const captadorId of uniqueIds) {
    const { data: earnings } = await supabase
      .from("earnings")
      .select("amount,type")
      .eq("user_id", captadorId)
      .in("type", ["account_completed", "referral_bonus"])
      .gte("created_at", startOfTodayIso)
      .lt("created_at", nowIso)
      .returns<{ amount: number; type: string }[]>();

    const amountBrl = (earnings ?? []).reduce((s, e) => s + Number(e.amount), 0);

    const { count: completedToday } = await supabase
      .from("accounts")
      .select("id", { count: "exact", head: true })
      .eq("captador_id", captadorId)
      .eq("status", "completed")
      .gte("completed_at", startOfTodayIso)
      .lt("completed_at", nowIso);

    const completed = Number(completedToday ?? 0);

    if (amountBrl === 0 && completed === 0) continue;

    try {
      await notifyCaptadorDailyCommission(captadorId, amountBrl, completed);
      notified++;
    } catch (err) {
      console.error("[cron/daily-commission] push failed", { captadorId, err });
    }
  }

  return NextResponse.json({ ok: true, notified });
}
