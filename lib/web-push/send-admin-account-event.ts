import webpush from "web-push";

import { createAdminClient } from "@/lib/supabase/admin";
import { webPushConfiguredFromEnv } from "@/lib/web-push/config";

async function sendToAdmins(payload: string): Promise<void> {
  const vapid = webPushConfiguredFromEnv();
  if (!vapid) return;

  const admin = createAdminClient();
  const { data: subscriptions } = await admin
    .from("admin_web_push_subscriptions")
    .select("id,endpoint,p256dh,auth");

  if (!subscriptions?.length) return;

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
        await admin.from("admin_web_push_subscriptions").delete().eq("id", row.id);
      } else {
        console.error("[web-push/admin] falha ao notificar admin", {
          statusCode,
          endpointHead: row.endpoint.slice(0, 64),
        });
      }
    }
  }
}

export async function notifyAdminsOnNewAccount(opts: {
  accountIdentifier: string;
  captadorName: string | null;
}): Promise<void> {
  const label = opts.accountIdentifier?.trim() || "Nova conta";
  const from = opts.captadorName?.trim() || "captador";
  await sendToAdmins(
    JSON.stringify({
      title: "📥 Nova conta enviada",
      body: `${label} — por ${from}. Aguardando operador.`,
      data: { url: "/admin/contas", tag: "admin-new-account" },
    }),
  );
}

export async function notifyAdminsOnAccountCompleted(opts: {
  accountIdentifier: string;
  captadorName: string | null;
}): Promise<void> {
  const label = opts.accountIdentifier?.trim() || "Conta";
  const from = opts.captadorName?.trim() || "captador";
  await sendToAdmins(
    JSON.stringify({
      title: "✅ Conta concluída",
      body: `${label} (${from}) foi finalizada pelo operador.`,
      data: { url: "/admin/contas", tag: "admin-account-completed" },
    }),
  );
}

export async function notifyAdminsOnAccountRejected(opts: {
  accountIdentifier: string;
  captadorName: string | null;
  reason: string | null;
}): Promise<void> {
  const label = opts.accountIdentifier?.trim() || "Conta";
  const from = opts.captadorName?.trim() || "captador";
  const motivo = opts.reason?.trim() ? ` — ${opts.reason.slice(0, 60)}` : "";
  await sendToAdmins(
    JSON.stringify({
      title: "❌ Conta recusada",
      body: `${label} (${from})${motivo}.`,
      data: { url: "/admin/contas", tag: "admin-account-rejected" },
    }),
  );
}
