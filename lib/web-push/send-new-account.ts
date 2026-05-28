import webpush from "web-push";

import { createAdminClient } from "@/lib/supabase/admin";
import { webPushConfiguredFromEnv } from "@/lib/web-push/config";

export async function notifyOperatorsOnNewAccountPush(opts: {
  accountIdentifier: string;
  captadorName: string | null;
}): Promise<void> {
  const vapid = webPushConfiguredFromEnv();
  if (!vapid) return;

  const admin = createAdminClient();

  const { data: subscriptions } = await admin
    .from("operator_web_push_subscriptions")
    .select("id,endpoint,p256dh,auth");

  if (!subscriptions?.length) return;

  const label = opts.accountIdentifier?.trim() || "Nova conta";
  const from = opts.captadorName?.trim() || "captador";

  const payload = JSON.stringify({
    title: "📥 Nova conta na fila",
    body: `${label} — enviada por ${from}. Acesse o painel para operar.`,
    data: {
      url: "/operador/dashboard",
      tag: "new-account",
    },
  });

  webpush.setVapidDetails(vapid.contact, vapid.publicKey, vapid.privateKey);

  for (const row of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } } as webpush.PushSubscription,
        payload,
        { TTL: 3_600 },
      );
    } catch (err: unknown) {
      const statusCode =
        typeof err === "object" && err !== null && "statusCode" in err
          ? Number((err as { statusCode?: number }).statusCode)
          : undefined;
      if (statusCode === 410 || statusCode === 404) {
        await admin.from("operator_web_push_subscriptions").delete().eq("id", row.id);
      } else {
        console.error("[web-push] falha ao notificar operador — nova conta", {
          statusCode,
          endpointHead: row.endpoint.slice(0, 64),
        });
      }
    }
  }
}
