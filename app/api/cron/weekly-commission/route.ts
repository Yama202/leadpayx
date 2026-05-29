import { NextResponse, type NextRequest } from "next/server";

import { getServerEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyAllCaptadoresWeeklyCommission } from "@/lib/web-push/send-captador-daily-stats";

export const dynamic = "force-dynamic";

function startOfWeekUtc(): Date {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 1=Mon … 6=Sat
  const diff = day === 0 ? -6 : 1 - day; // Monday
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff));
  return monday;
}

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

  const { data: captadores, error: captadoresErr } = await supabase
    .from("captador_web_push_subscriptions")
    .select("user_id")
    .returns<{ user_id: string }[]>();

  if (captadoresErr) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const uniqueIds = [...new Set((captadores ?? []).map((r) => r.user_id))];

  const now = new Date();
  const weekStartIso = startOfWeekUtc().toISOString();
  const nowIso = now.toISOString();

  let notified = 0;

  for (const captadorId of uniqueIds) {
    const { data: earnings } = await supabase
      .from("earnings")
      .select("amount,type")
      .eq("user_id", captadorId)
      .in("type", ["account_completed", "referral_bonus"])
      .gte("created_at", weekStartIso)
      .lt("created_at", nowIso)
      .returns<{ amount: number; type: string }[]>();

    const amountBrl = (earnings ?? []).reduce((s, e) => s + Number(e.amount), 0);

    const { count: completedThisWeek } = await supabase
      .from("accounts")
      .select("id", { count: "exact", head: true })
      .eq("captador_id", captadorId)
      .eq("status", "completed")
      .gte("completed_at", weekStartIso)
      .lt("completed_at", nowIso);

    const completed = Number(completedThisWeek ?? 0);

    if (amountBrl <= 0) continue;

    try {
      await notifyAllCaptadoresWeeklyCommission(captadorId, amountBrl, completed);
      notified++;
    } catch (err) {
      console.error("[cron/weekly-commission] push failed", { captadorId, err });
    }
  }

  return NextResponse.json({ ok: true, notified });
}
