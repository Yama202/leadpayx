import webpush from "web-push";

import { createAdminClient } from "@/lib/supabase/admin";
import { toCurrency } from "@/lib/payments";
import { webPushConfiguredFromEnv } from "@/lib/web-push/config";

async function sendToOneSubscriber(
  sub: { id: string; endpoint: string; p256dh: string; auth: string },
  payload: string,
): Promise<"ok" | "expired"> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } } as webpush.PushSubscription,
      payload,
      { TTL: 86_400 },
    );
    return "ok";
  } catch (err: unknown) {
    const statusCode =
      typeof err === "object" && err !== null && "statusCode" in err
        ? Number((err as { statusCode?: number }).statusCode)
        : undefined;
    if (statusCode === 410 || statusCode === 404) return "expired";
    console.error("[web-push] send error", {
      statusCode,
      endpointHead: sub.endpoint.slice(0, 64),
    });
    return "ok";
  }
}

async function sendToAllCaptadores(payload: string): Promise<void> {
  const vapid = webPushConfiguredFromEnv();
  if (!vapid) return;

  const admin = createAdminClient();
  const { data: subs, error } = await admin
    .from("captador_web_push_subscriptions")
    .select("id,endpoint,p256dh,auth");

  if (error || !subs?.length) return;

  webpush.setVapidDetails(vapid.contact, vapid.publicKey, vapid.privateKey);

  for (const sub of subs) {
    const result = await sendToOneSubscriber(sub, payload);
    if (result === "expired") {
      await admin.from("captador_web_push_subscriptions").delete().eq("id", sub.id);
    }
  }
}

/** Notifica um captador específico com o resumo de comissão do dia */
export async function notifyCaptadorDailyCommission(
  captadorId: string,
  amountBrl: number,
  completedToday: number,
): Promise<void> {
  const vapid = webPushConfiguredFromEnv();
  if (!vapid) return;

  const admin = createAdminClient();
  const { data: subs, error } = await admin
    .from("captador_web_push_subscriptions")
    .select("id,endpoint,p256dh,auth")
    .eq("user_id", captadorId);

  if (error || !subs?.length) return;

  const body =
    amountBrl > 0
      ? `Você já recebeu ${toCurrency(amountBrl)} de comissão hoje com ${completedToday} conta${completedToday !== 1 ? "s" : ""} concluída${completedToday !== 1 ? "s" : ""}. Continue assim!`
      : `Conclua contas hoje para começar a acumular comissão!`;

  const payload = JSON.stringify({
    title: "💰 Bom trabalho hoje!",
    body,
    data: { url: "/captador/pagamentos" },
  });

  webpush.setVapidDetails(vapid.contact, vapid.publicKey, vapid.privateKey);

  for (const sub of subs) {
    const result = await sendToOneSubscriber(sub, payload);
    if (result === "expired") {
      await admin.from("captador_web_push_subscriptions").delete().eq("id", sub.id);
    }
  }
}

/** Envia ranking do dia (top 3) para TODOS os captadores com subscription */
export async function notifyAllCaptadoresDailyRanking(
  top3: { name: string; completed: number }[],
): Promise<void> {
  if (!top3.length) return;

  const medals = ["1º", "2º", "3º"];
  const lines = top3
    .slice(0, 3)
    .map((r, i) => `${medals[i]} ${r.name} · ${r.completed} conta${r.completed !== 1 ? "s" : ""}`)
    .join("\n");

  const payload = JSON.stringify({
    title: "🏆 Ranking do dia — quem está na frente",
    body: lines,
    data: { url: "/captador/dashboard" },
  });

  await sendToAllCaptadores(payload);
}

/** Envia notificação de prêmio do dia para TODOS os captadores */
export async function notifyAllCaptadoresPrize(description: string): Promise<void> {
  const payload = JSON.stringify({
    title: "🎁 Prêmio de hoje!",
    body: `${description}\nQuem trouxer mais contas hoje ganha!`,
    data: { url: "/captador/dashboard" },
  });

  await sendToAllCaptadores(payload);
}

/** Notifica um captador específico com o resumo de comissão da semana */
export async function notifyAllCaptadoresWeeklyCommission(
  captadorId: string,
  amountBrl: number,
  completedThisWeek: number,
): Promise<void> {
  if (amountBrl <= 0) return;

  const vapid = webPushConfiguredFromEnv();
  if (!vapid) return;

  const admin = createAdminClient();
  const { data: subs, error } = await admin
    .from("captador_web_push_subscriptions")
    .select("id,endpoint,p256dh,auth")
    .eq("user_id", captadorId);

  if (error || !subs?.length) return;

  const payload = JSON.stringify({
    title: "📊 Sua semana no LeadPayX",
    body: `Você ganhou ${toCurrency(amountBrl)} esta semana com ${completedThisWeek} conta${completedThisWeek !== 1 ? "s" : ""} concluída${completedThisWeek !== 1 ? "s" : ""}. Ótimo trabalho!`,
    data: { url: "/captador/pagamentos" },
  });

  webpush.setVapidDetails(vapid.contact, vapid.publicKey, vapid.privateKey);

  for (const sub of subs) {
    const result = await sendToOneSubscriber(sub, payload);
    if (result === "expired") {
      await admin.from("captador_web_push_subscriptions").delete().eq("id", sub.id);
    }
  }
}

export async function notifyAllCaptadoresWeeklyPrize(description: string): Promise<void> {
  const vapid = webPushConfiguredFromEnv();
  if (!vapid) return;

  const admin = createAdminClient();
  const { data: subs } = await admin.from("captador_web_push_subscriptions").select("id,endpoint,p256dh,auth");
  if (!subs?.length) return;

  const payload = JSON.stringify({
    title: "🏆 Prêmio semanal ativado!",
    body: description + "\nQuem trouxer mais contas esta semana ganha!",
    data: { url: "/captador/dashboard" },
  });

  webpush.setVapidDetails(vapid.contact, vapid.publicKey, vapid.privateKey);

  for (const sub of subs) {
    const result = await sendToOneSubscriber(sub, payload);
    if (result === "expired") {
      await admin.from("captador_web_push_subscriptions").delete().eq("id", sub.id);
    }
  }
}

export async function notifyAllCaptadoresWeeklyGoal(prizeDescription: string, minAccounts: number, minReferrals: number): Promise<void> {
  const vapid = webPushConfiguredFromEnv();
  if (!vapid) return;

  const admin = createAdminClient();
  const { data: subs } = await admin.from("captador_web_push_subscriptions").select("id,endpoint,p256dh,auth");
  if (!subs?.length) return;

  const payload = JSON.stringify({
    title: "🎯 Meta semanal ativada!",
    body: `Traga ${minAccounts} contas e ${minReferrals} indicações validadas esta semana e ganhe: ${prizeDescription}`,
    data: { url: "/captador/dashboard" },
  });

  webpush.setVapidDetails(vapid.contact, vapid.publicKey, vapid.privateKey);

  for (const sub of subs) {
    const result = await sendToOneSubscriber(sub, payload);
    if (result === "expired") {
      await admin.from("captador_web_push_subscriptions").delete().eq("id", sub.id);
    }
  }
}
