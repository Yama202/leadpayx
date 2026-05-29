"use client";

import { useCallback, useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { PushRegisterActionState } from "@/lib/actions/admin-push";
import {
  registerAdminPushSubscriptionAction,
  removeAdminPushSubscriptionAction,
} from "@/lib/actions/admin-push";
import { pushClientsideSupported, urlBase64ToUint8Array } from "@/lib/push-client";

export function AdminPushSettings(props: {
  vapidPublicKey: string | null;
  subscriptionCountServer: number;
}) {
  const [state, setState] = useState<PushRegisterActionState | null>(null);
  const [busy, startTransition] = useTransition();

  const unsupportedReason = useMemo(() => {
    if (typeof window === "undefined") return null;
    const s = pushClientsideSupported(window);
    if (!s.secure && window.location.hostname !== "localhost") {
      return "Requer HTTPS.";
    }
    if (!s.sw || !s.pushManager || !s.permission) {
      return "Navegador não suporta Web Push neste modo.";
    }
    if (!props.vapidPublicKey?.trim()) {
      return "Chave VAPID não configurada no servidor.";
    }
    return null;
  }, [props.vapidPublicKey]);

  const activate = useCallback(() => {
    const vapid = props.vapidPublicKey;
    if (!vapid) return;
    startTransition(async () => {
      try {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") {
          setState({ ok: false, message: "Permissão negada. Ajuste nas configurações do navegador." });
          return;
        }
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource,
        });
        const fd = new FormData();
        fd.set("subscription", JSON.stringify(sub.toJSON()));
        const result = await registerAdminPushSubscriptionAction(undefined, fd);
        setState(result);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setState({ ok: false, message: `Erro: ${msg}` });
      }
    });
  }, [props.vapidPublicKey]);

  const deactivate = useCallback(() => {
    startTransition(async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!sub) {
          setState({ ok: false, message: "Nenhuma subscrição ativa neste dispositivo." });
          return;
        }
        const fd = new FormData();
        fd.set("endpoint", sub.endpoint);
        await sub.unsubscribe();
        const result = await removeAdminPushSubscriptionAction(undefined, fd);
        setState(result);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setState({ ok: false, message: `Erro: ${msg}` });
      }
    });
  }, []);

  const isActive = state?.ok === true
    ? state.message.includes("ativadas")
    : props.subscriptionCountServer > 0;

  if (unsupportedReason) return null;

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-bold text-zinc-200">Notificações push (admin)</p>
        <p className="text-xs text-zinc-500">
          {isActive
            ? "Ativo neste dispositivo — avisa quando uma conta é enviada, concluída ou recusada."
            : "Receba alertas de novas contas, conclusões e recusas neste dispositivo."}
        </p>
        {state && (
          <p className={`mt-1 text-xs font-semibold ${state.ok ? "text-emerald-400" : "text-rose-400"}`}>
            {state.message}
          </p>
        )}
      </div>
      <Button
        className="shrink-0"
        disabled={busy}
        onClick={isActive ? deactivate : activate}
        variant="secondary"
      >
        {busy ? "…" : isActive ? "Desativar" : "Ativar"}
      </Button>
    </div>
  );
}
