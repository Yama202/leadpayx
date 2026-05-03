import webpush from "web-push";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { toCurrency } from "@/lib/payments";
import { webPushConfiguredFromEnv } from "@/lib/web-push/config";

export type CaptadorCompletionPushPayload = {
  title: string;
  body: string;
  data: {
    accountId: string;
    commissionBrl: number;
    accountIdentifier?: string | null;
    url: string;
  };
};

/**
 * Caminho relativo para o clic na notificação (ver `public/push-sw.js`).
 * O SW junta ao `origin` do worker; URLs absolutas antigas faziam falhar `startsWith("/")`.
 */
function buildCaptadorNotificationPath(accountId: string): string {
  return `/captador/minhas-contas?id=${encodeURIComponent(accountId)}`;
}

/**
 * Payload pronto para o service worker (`showNotification`).
 * Replica o espírito de `notify_captador_account_completed` (comissão + identificador).
 */
export async function buildCaptadorCompletionPushPayload(accountId: string, captadorId: string): Promise<CaptadorCompletionPushPayload | null> {
  const admin = createAdminClient();

  const { data: earning } = await admin
    .from("earnings")
    .select("amount")
    .eq("account_id", accountId)
    .eq("user_id", captadorId)
    .eq("type", "account_completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let amount = earning?.amount != null ? Number(earning.amount) : null;

  if (amount == null || Number.isNaN(amount)) {
    const rpc = await admin.rpc("get_captador_commission", {
      target_captador_id: captadorId,
      target_account_id: accountId,
    });

    const v = rpc.data as unknown;
    if (typeof v === "number" && Number.isFinite(v)) {
      amount = v;
    } else if (typeof v === "string" && v.trim()) {
      const n = Number(v);
      amount = Number.isFinite(n) ? n : null;
    }
  }

  const resolved = Number.isFinite(amount ?? NaN) ? (amount as number) : 0;

  const { data: accountRow } = await admin
    .from("accounts")
    .select("account_identifier")
    .eq("id", accountId)
    .maybeSingle();

  const label = accountRow?.account_identifier?.trim() || "—";
  const valueStr = toCurrency(resolved);

  return {
    title: "💚 Comissão creditada!",
    body: `${valueStr} na conta · ${label} · valor da sua comissão confirmado pela operação.`,
    data: {
      accountId,
      commissionBrl: resolved,
      accountIdentifier: label,
      url: buildCaptadorNotificationPath(accountId),
    },
  };
}

/**
 * Chamado dentro do servidor após `complete_account` bem-sucedido.
 * Anti-spoof: confirma com a sessão do operador que a conta ficou completed e está atribuída a esse operador.
 * Idempotência: `captador_completion_push_delivery.account_id`.
 */
export async function notifyCaptadorOnAccountCompletionPush(opts: {
  actorUserId: string;
  accountId: string;
}): Promise<void> {
  const vapid = webPushConfiguredFromEnv();
  if (!vapid) {
    console.warn("[web-push] VAPID ausente — envio omisso (defina NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY e WEB_PUSH_VAPID_PRIVATE_KEY).");
    return;
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: account, error: accErr } = await supabase
    .from("accounts")
    .select("id, captador_id, operador_id, status")
    .eq("id", opts.accountId)
    .maybeSingle();

  if (accErr || !account) {
    console.error("[web-push] conta ausente ao validar anti-spoof", accErr?.message);
    return;
  }

  if (account.status !== "completed") {
    console.warn("[web-push] envio omitido — conta não está em completed nesta leitura", { accountId: opts.accountId });
    return;
  }

  if (account.operador_id !== opts.actorUserId) {
    console.error("[web-push] anti-spoof: operador da sessão não corresponde à conta", {
      accountId: opts.accountId,
    });
    return;
  }

  const captadorId = account.captador_id;
  if (!captadorId) {
    return;
  }

  const { data: seen } = await admin
    .from("captador_completion_push_delivery")
    .select("account_id")
    .eq("account_id", opts.accountId)
    .maybeSingle();

  if (seen) {
    return;
  }

  const payload = await buildCaptadorCompletionPushPayload(opts.accountId, captadorId);
  if (!payload) {
    return;
  }

  webpush.setVapidDetails(vapid.contact, vapid.publicKey, vapid.privateKey);

  const { data: subscriptions, error: subErr } = await admin
    .from("captador_web_push_subscriptions")
    .select("id,endpoint,p256dh,auth")
    .eq("user_id", captadorId);

  if (subErr) {
    console.error("[web-push] erro ao ler subscriptions", subErr.message);
    return;
  }

  const body = JSON.stringify(payload);
  const targeted = subscriptions?.length ?? 0;

  for (const row of subscriptions ?? []) {
    const pushSub = {
      endpoint: row.endpoint,
      keys: {
        p256dh: row.p256dh,
        auth: row.auth,
      },
    };

    try {
      await webpush.sendNotification(pushSub as webpush.PushSubscription, body, {
        TTL: 86_400,
      });
    } catch (err: unknown) {
      const statusCode =
        typeof err === "object" && err !== null && "statusCode" in err
          ? Number((err as { statusCode?: number }).statusCode)
          : undefined;

      const msg = typeof err === "object" && err !== null && "message" in err ? String((err as Error).message) : String(err);

      const bodyReject =
        typeof err === "object" && err !== null && "body" in err
          ? String((err as { body?: string }).body ?? "").slice(0, 500)
          : "";

      console.error("[web-push] falha gateway", {
        accountId: opts.accountId,
        statusCode,
        endpointHead: row.endpoint.slice(0, 64),
        detail: msg,
        payloadRejected: Boolean(bodyReject),
        gatewayBodySnippet: bodyReject || undefined,
      });

      if (statusCode === 410 || statusCode === 404) {
        const del = await admin.from("captador_web_push_subscriptions").delete().eq("id", row.id);
        if (del.error) {
          console.error("[web-push] subscription expirada—falha ao apagar linha", del.error.message);
        } else {
          console.warn("[web-push] subscription removida (410/404)");
        }
      }
    }
  }

  const { error: deliveredErr } = await admin.from("captador_completion_push_delivery").insert({
    account_id: opts.accountId,
    captador_user_id: captadorId,
    subscriptions_targeted: targeted,
  });

  if (deliveredErr?.code === "23505") {
    console.warn("[web-push] marca de idempotência já existente (corrida paralela)—ok");
  } else if (deliveredErr) {
    console.error("[web-push] falha ao gravar marca de envio idempotente", deliveredErr.message);
  }
}
