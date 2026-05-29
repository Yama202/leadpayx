"use client";

import { useCallback, useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { PushRegisterActionState } from "@/lib/actions/captador-push";
import {
  registerCaptadorPushSubscriptionAction,
  removeCaptadorPushSubscriptionAction,
} from "@/lib/actions/captador-push";
import { pushClientsideSupported, urlBase64ToUint8Array } from "@/lib/push-client";

function detectSafariUa(ua: string) {
  return /Safari/i.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|EdgiOS/i.test(ua);
}

export function CaptadorPushSettings(props: {
  vapidPublicKey: string | null;
  subscriptionCountServer: number;
}) {
  const [state, setState] = useState<PushRegisterActionState | null>(null);
  const [removeState, setRemoveState] = useState<PushRegisterActionState | null>(null);
  const [busy, startTransition] = useTransition();

  const tips = useMemo(() => {
    if (typeof window === "undefined") {
      return { chrome: "", safariIos: "", general: "", isIos: false, isSafariFamily: false, standalone: false };
    }

    const ua = navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const safari = detectSafariUa(ua);
    const standalone = window.matchMedia("(display-mode: standalone)").matches;

    return {
      isIos,
      isSafariFamily: safari,
      standalone,
      chrome:
        "No Chrome (desktop ou Android): aceite quando o navegador pedir. Se bloqueou antes, ajuste em Configurações do site → Permissões → Notificações.",
      safariIos:
        "No iPhone (iOS ≥ 16.4): o Web Push só funciona com o site instalado na Tela Inicial (Safari → Compartilhar → Adicionar à Tela Inicial). Depois, abra pelo ícone criado e ative aqui.",
      general:
        "Precisa de HTTPS (exceto localhost). Navegação privada ou extensões podem bloquear service worker — teste numa aba normal.",
    };
  }, []);

  const unsupportedReason = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const s = pushClientsideSupported(window);
    if (!s.secure && window.location.hostname !== "localhost") {
      return "Este URL não está em HTTPS. Ative apenas em produção HTTPS ou localhost para testes.";
    }
    if (!s.sw || !s.pushManager || !s.permission) {
      return "Este navegador não oferece Web Push neste modo (Safari desktop antigo ou WebView?). Use Chrome/Edge atualizados ou iOS Safari instalado como PWA.";
    }
    if (!props.vapidPublicKey?.trim()) {
      return "O servidor não expôs uma chave pública Web Push — confirme NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY no deploy.";
    }
    return null;
  }, [props.vapidPublicKey]);

  const registerPush = useCallback(async () => {
    setState(null);
    if (unsupportedReason) {
      setState({
        ok: false,
        message: unsupportedReason,
      });
      return;
    }

    const vapid = props.vapidPublicKey as string;

    startTransition(async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        await navigator.serviceWorker.ready;

        const perm =
          Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;

        if (perm !== "granted") {
          setState({
            ok: false,
            message:
              permissionDeniedCopy(perm) ||
              "Permissão não concedida. Abra as configurações do site ou do navegador e permita notificações para este domínio.",
          });
          return;
        }

        // Se já existe subscrição com chave diferente, remove antes de criar nova.
        const existing = await reg.pushManager.getSubscription();
        if (existing) await existing.unsubscribe();

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource,
        });

        const fd = new FormData();
        fd.set("subscription", JSON.stringify(sub.toJSON()));
        const res = await registerCaptadorPushSubscriptionAction(undefined, fd);
        setState(res);
      } catch (e) {
        console.error("[CaptadorPushSettings]", e);
        const msg =
          e instanceof DOMException ? `${e.name}: ${e.message}` : e instanceof Error ? e.message : String(e);

        let detail = "";
        if (/applicationServerKey|InvalidAccessError/i.test(msg)) {
          detail = " Possível causa: chave pública Web Push não corresponde à privada do servidor.";
        }

        setState({
          ok: false,
          message: `Erro técnico ao registrar (${msg}).${detail}`,
        });
      }
    });
  }, [props.vapidPublicKey, unsupportedReason, startTransition]);

  const unregisterPush = useCallback(async () => {
    setRemoveState(null);

    startTransition(async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = reg ? await reg.pushManager.getSubscription() : null;

        if (sub?.endpoint) {
          const fd = new FormData();
          fd.set("endpoint", sub.endpoint);
          const res = await removeCaptadorPushSubscriptionAction(undefined, fd);
          setRemoveState(res);
        }

        await sub?.unsubscribe();
      } catch (e) {
        console.error("[CaptadorPushSettings] remove", e);
        setRemoveState({
          ok: false,
          message: "Falha ao remover no dispositivo — tente outra vez.",
        });
      }
    });
  }, [startTransition]);

  const persistedOk =
    props.subscriptionCountServer > 0 && typeof window !== "undefined" && Notification.permission === "granted";

  const showIosExtra = typeof window !== "undefined" ? tips.isIos && !tips.standalone && tips.isSafariFamily : false;

  return (
    <section className="mb-6 rounded-[2rem] border border-[#00E07A]/20 bg-black/20 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <h2 className="text-lg font-black text-white">Ativar notificações</h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">
        Quando um operador concluir uma conta sua, pode receber até <strong className="text-zinc-200">uma alerta por conta</strong>{" "}
        (com valor da comissão), igual aos avisos dentro do app — agora também no sistema.
      </p>

      <details className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-sm">
        <summary className="cursor-pointer font-bold text-[#16F28A]">Como ligar • Chrome vs Safari • iPhone</summary>
        <div className="mt-3 space-y-3 text-zinc-300">
          <p>
            <span className="font-semibold text-white">Chrome (desktop/Android instalado ou PWA):</span> {tips.chrome}
          </p>
          <p>
            <span className="font-semibold text-white">Safari em iPhone:</span> {tips.safariIos}
          </p>
          <p>
            <span className="font-semibold text-white">Geral:</span> {tips.general}
          </p>
          {showIosExtra ? (
            <p className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 font-semibold text-amber-100">
              Este iPhone parece estar usando Safari <strong>fora</strong> do modo PWA. Adicione primeiro à Tela Inicial
              e volte aqui pelo ícone do app para concluir.
            </p>
          ) : null}
        </div>
      </details>

      {showIosExtra ? (
        <div className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-400/[0.07] px-4 py-4 text-sm text-amber-100">
          <p className="mb-2 font-black text-amber-300">Instale o app para ativar notificações no iPhone</p>
          <ol className="space-y-1.5 text-amber-100/90">
            <li><span className="font-bold">1.</span> Toque no ícone <span className="font-bold">Compartilhar</span> (quadrado com seta ↑) na barra do Safari</li>
            <li><span className="font-bold">2.</span> Escolha <span className="font-bold">"Adicionar à Tela Inicial"</span></li>
            <li><span className="font-bold">3.</span> Confirme tocando em <span className="font-bold">"Adicionar"</span></li>
            <li><span className="font-bold">4.</span> Abra o app pelo ícone criado e ative aqui</li>
          </ol>
          <p className="mt-2 text-xs text-amber-200/60">Requer iOS 16.4 ou superior.</p>
        </div>
      ) : unsupportedReason ? (
        <p className="mt-4 rounded-2xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {unsupportedReason}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        {!showIosExtra ? (
          <Button disabled={busy || Boolean(unsupportedReason)} onClick={() => void registerPush()} type="button">
            {busy ? "Registrando…" : "Pedir permissão e guardar"}
          </Button>
        ) : null}
        <Button disabled={busy} onClick={() => void unregisterPush()} type="button" variant="secondary">
          Remover deste dispositivo
        </Button>
      </div>

      {(state ?? removeState)?.ok === false ? (
        <p className="mt-4 rounded-2xl border border-rose-500/25 bg-black/40 px-4 py-3 text-sm text-rose-100">
          {(state ?? removeState)?.message}
        </p>
      ) : null}

      {(state ?? removeState)?.ok === true ? (
        <p className="mt-4 rounded-2xl border border-[#00E07A]/30 bg-[#00E07A]/10 px-4 py-3 text-sm font-semibold text-[#bdf8d9]">
          {(state ?? removeState)?.message}
        </p>
      ) : null}

      {persistedOk && !state?.ok && !(removeState && !removeState.ok) ? (
        <p className="mt-4 text-xs font-semibold text-zinc-500">
          Estado servidor: já existe subscrição ativa registada nesta conta (pode incluir outros dispositivos).
        </p>
      ) : null}
    </section>
  );
}

function permissionDeniedCopy(perm: NotificationPermission): string | null {
  if (perm === "denied") {
    return "O navegador bloqueou notificações neste domínio. Ajuda: Configurações do site ou Privacidade e segurança → Notificações → permitir este site.";
  }
  return null;
}
