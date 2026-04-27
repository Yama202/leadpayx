import { NextResponse, type NextRequest } from "next/server";

import { getServerEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const { data, error } = await supabase.rpc("reassign_expired_operator_accounts");

  if (error) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true, reassigned: data ?? 0 });
}
