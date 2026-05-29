import webpush from "web-push";

import { createAdminClient } from "@/lib/supabase/admin";
import { toCurrency } from "@/lib/payments";
import { webPushConfiguredFromEnv } from "@/lib/web-push/config";

export async function notifyCaptadorPayoutCompletedPush(
  captadorId: string,
  amountPaid: number,
): Promise<void> {
  const vapid = webPushConfiguredFromEnv();
  if (!vapid) return;

  const admin = createAdminClient();

  const { data: subscriptions } = await admin
    .from("captador_web_push_subscriptions")
    .select("id,endpoint,p256dh,auth")
    .eq("user_id", captadorId);

  if (!subscriptions?.length) return;

  const valueStr = toCurrency(amountPaid);

  const payload = JSON.stringify({
    title: "💸 Pagamento enviado!",
    body: amountPaid > 0
      ? `Sua comissão de ${valueStr} foi enviada via Pix. Confira no app.`
      : `Sua comissão foi registrada. Confira no app.`,
    data: {
      url: "/captador/pagamentos",
      tag: "payout-completed",
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
        console.error("[web-push] falha ao notificar captador — payout concluído", {
          statusCode,
          endpointHead: row.endpoint.slice(0, 64),
        });
      }
    }
  }
}
