import webpush from "web-push";

import { createAdminClient } from "@/lib/supabase/admin";
import { webPushConfiguredFromEnv } from "@/lib/web-push/config";

export async function notifyCaptadorOnWrongPasswordPush(accountId: string): Promise<void> {
  const vapid = webPushConfiguredFromEnv();
  if (!vapid) return;

  const admin = createAdminClient();

  const { data: account } = await admin
    .from("accounts")
    .select("captador_id, account_identifier")
    .eq("id", accountId)
    .maybeSingle();

  if (!account?.captador_id) return;

  const { data: subscriptions } = await admin
    .from("captador_web_push_subscriptions")
    .select("id,endpoint,p256dh,auth")
    .eq("user_id", account.captador_id);

  if (!subscriptions?.length) return;

  const label = account.account_identifier?.trim() || "Conta";
  const payload = JSON.stringify({
    title: "🔑 Senha incorreta — corrija para reenviar",
    body: `${label}: a senha está errada. Acesse "Minhas contas" e corrija para voltar à fila.`,
    data: {
      url: "/captador/minhas-contas",
      tag: "wrong-password",
    },
  });

  webpush.setVapidDetails(vapid.contact, vapid.publicKey, vapid.privateKey);

  for (const row of subscriptions) {
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
      } else {
        console.error("[web-push] falha ao notificar captador — senha incorreta", {
          statusCode,
          endpointHead: row.endpoint.slice(0, 64),
        });
      }
    }
  }
}
