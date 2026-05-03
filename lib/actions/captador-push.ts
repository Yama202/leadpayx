"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { z } from "zod";

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export type PushRegisterActionState =
  | { ok: true; message: string }
  | { ok: false; message: string };

export async function registerCaptadorPushSubscriptionAction(prev: PushRegisterActionState | void, fd: FormData): Promise<PushRegisterActionState> {
  void prev;
  const profile = await requireRole(["captador"]);

  const raw = fd.get("subscription");
  if (!raw || typeof raw !== "string") {
    return { ok: false, message: "Payload de subscrição em falta." };
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(raw);
  } catch {
    return { ok: false, message: "JSON da subscrição inválido." };
  }

  const parsed = pushSubscriptionSchema.safeParse(parsedBody);
  if (!parsed.success) {
    return { ok: false, message: "Formato Web Push não reconhecido." };
  }

  const hdrs = await headers();
  const userAgent = hdrs.get("user-agent") ?? null;

  const supabase = await createClient();

  const { error } = await supabase.from("captador_web_push_subscriptions").upsert(
    {
      user_id: profile.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      user_agent: userAgent,
      last_registered_at: new Date().toISOString(),
    },
    { onConflict: "endpoint", ignoreDuplicates: false },
  );

  if (error) {
    console.error("[captador-push] upsert falhou", error.message);
    return { ok: false, message: "Não foi possível salvar o registro de notificação push. Tente de novo." };
  }

  revalidatePath("/captador/dashboard");
  revalidatePath("/captador/avisos");

  return { ok: true, message: "Notificações ativadas neste dispositivo." };
}

export async function removeCaptadorPushSubscriptionAction(prev: PushRegisterActionState | void, fd: FormData): Promise<PushRegisterActionState> {
  void prev;
  const profile = await requireRole(["captador"]);

  const endpoint = fd.get("endpoint");
  if (!endpoint || typeof endpoint !== "string") {
    return { ok: false, message: "Endpoint em falta." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("captador_web_push_subscriptions")
    .delete()
    .eq("user_id", profile.id)
    .eq("endpoint", endpoint);

  if (error) {
    console.error("[captador-push] delete falhou", error.message);
    return { ok: false, message: "Não foi possível remover a subscrição." };
  }

  revalidatePath("/captador/dashboard");
  revalidatePath("/captador/avisos");

  return { ok: true, message: "Subscrição removida." };
}
