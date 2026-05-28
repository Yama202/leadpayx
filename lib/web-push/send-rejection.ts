import webpush from "web-push";

import { createAdminClient } from "@/lib/supabase/admin";
import { webPushConfiguredFromEnv } from "@/lib/web-push/config";

export async function notifyCaptadorOnAccountRejectionPush(opts: {
  accountId: string;
  rejectionType: string;
}): Promise<void> {
  const vapid = webPushConfiguredFromEnv();
  if (!vapid) {
    return;
  }

  const admin = createAdminClient();

  const { data: account } = await admin
    .from("accounts")
    .select("captador_id, account_identifier, status, rejection_reason")
    .eq("id", opts.accountId)
    .maybeSingle();

  if (!account?.captador_id) return;

  const label = account.account_identifier?.trim() || "—";
  const reason = account.rejection_reason?.trim() || null;

  let title: string;
  let body: string;

  if (opts.rejectionType === "no_balance") {
    title = "⚠️ Conta sem saldo — ação necessária";
    body = reason
      ? `${label} — ${reason}. Deposite o saldo e toque em "Já coloquei o saldo".`
      : `${label} — deposite o saldo mínimo na plataforma e toque em "Já coloquei o saldo".`;
  } else if (opts.rejectionType === "no_facial") {
    title = "⚠️ Selfie pendente — ação necessária";
    body = reason
      ? `${label} — ${reason}. Faça a selfie na plataforma e toque em "Já fiz a selfie".`
      : `${label} — faça a verificação facial na plataforma e toque em "Já fiz a selfie".`;
  } else {
    title = "❌ Conta recusada";
    body = reason
      ? `${label} — Motivo: ${reason}.`
      : `${label} — recusada definitivamente. Não retornará para a fila.`;
  }

  const payload = JSON.stringify({
    title,
    body,
    data: {
      accountId: opts.accountId,
      url: `/captador/minhas-contas?id=${encodeURIComponent(opts.accountId)}`,
    },
  });

  webpush.setVapidDetails(vapid.contact, vapid.publicKey, vapid.privateKey);

  const { data: subscriptions } = await admin
    .from("captador_web_push_subscriptions")
    .select("id,endpoint,p256dh,auth")
    .eq("user_id", account.captador_id);

  for (const row of subscriptions ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } } as webpush.PushSubscription,
        payload,
        { TTL: 86_400 },
      );
    } catch (err: unknown) {
      const statusCode =
        typeof err === "object" && err !== null && "statusCode" in err
          ? Number((err as { statusCode?: number }).statusCode)
          : undefined;
      if (statusCode === 410 || statusCode === 404) {
        await admin.from("captador_web_push_subscriptions").delete().eq("id", row.id);
      }
    }
  }
}
