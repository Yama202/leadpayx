import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  adminDeleteManagedUserAction,
  adminUpdateProfileAction,
} from "@/lib/actions/domain";
import { maskPixKeyForAdmin } from "@/lib/pix-key";
import type { Profile } from "@/lib/types";

export type ProfileAdminDangerZone = "prominent" | "collapsed";

export function ProfileAdminEditor({
  profile,
  dangerZone = "prominent",
}: {
  profile: Profile;
  dangerZone?: ProfileAdminDangerZone;
}) {
  const instagramHandle = profile.instagram?.trim().replace(/^@+/, "") ?? "";
  const instagramUrl = instagramHandle ? `https://instagram.com/${instagramHandle}` : null;
  const whatsappDigits = profile.whatsapp?.replace(/\D/g, "") ?? "";
  const whatsappUrl = whatsappDigits ? `https://wa.me/${whatsappDigits}` : null;
  const pixQrUrl = profile.pix_key
    ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(profile.pix_key)}`
    : null;

  const deleteForm = (
    <form
      action={adminDeleteManagedUserAction}
      className={
        dangerZone === "prominent"
          ? "space-y-2 rounded-2xl border border-rose-300/40 bg-rose-50/80 p-3 dark:border-rose-400/20 dark:bg-rose-500/10"
          : "space-y-2"
      }
    >
      <input name="profileId" type="hidden" value={profile.id} />
      <input name="role" type="hidden" value={profile.role} />
      <input
        name="returnPath"
        type="hidden"
        value={profile.role === "captador" ? "/admin/captadores" : "/admin/operadores"}
      />
      <p className="text-xs font-semibold text-rose-700 dark:text-rose-200">
        Exclusão segura: bloqueia quando há contas/pagamentos em aberto.
      </p>
      <input
        aria-label="Digite EXCLUIR para confirmar a exclusão"
        className="min-h-11 w-full rounded-xl border border-rose-300/60 bg-white px-3 text-sm font-semibold text-rose-900 placeholder:text-rose-500/80 dark:border-rose-300/20 dark:bg-slate-950/70 dark:text-rose-100"
        name="confirmation"
        placeholder="Digite EXCLUIR para confirmar"
        {...(dangerZone === "prominent" ? { required: true } : {})}
      />
      <Button className="w-full" type="submit" variant="danger">
        Excluir {profile.role === "captador" ? "captador" : "operador"}
      </Button>
    </form>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {instagramUrl ? (
          <Link
            className="inline-flex min-h-9 cursor-pointer items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:bg-slate-900"
            href={instagramUrl}
            rel="noreferrer"
            target="_blank"
          >
            Instagram
          </Link>
        ) : null}
        {whatsappUrl ? (
          <Link
            className="inline-flex min-h-9 cursor-pointer items-center rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/15"
            href={whatsappUrl}
            rel="noreferrer"
            target="_blank"
          >
            WhatsApp
          </Link>
        ) : null}
        {pixQrUrl ? (
          <Link
            className="inline-flex min-h-9 cursor-pointer items-center rounded-xl border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-400/30 dark:bg-indigo-500/10 dark:text-indigo-200 dark:hover:bg-indigo-500/15"
            href={pixQrUrl}
            rel="noreferrer"
            target="_blank"
          >
            QR Pix
          </Link>
        ) : null}
      </div>
      {profile.role === "captador" ? (
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
          Pix (mascarado):{" "}
          <span className="font-mono text-slate-800 dark:text-slate-200">
            {maskPixKeyForAdmin(profile.pix_key)}
          </span>
        </p>
      ) : null}

      <form action={adminUpdateProfileAction} className="grid gap-3 sm:grid-cols-2">
        <input name="profileId" type="hidden" value={profile.id} />
        <label className="sm:col-span-1">
          <span className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
            Papel
          </span>
          <select
            className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
            defaultValue={profile.role}
            name="role"
          >
            <option value="captador">Captador</option>
            <option value="operator">Operador</option>
          </select>
        </label>
        <label className="sm:col-span-1">
          <span className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
            Status
          </span>
          <select
            className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
            defaultValue={profile.status}
            name="status"
          >
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
          </select>
        </label>
        <label className="sm:col-span-2">
          <span className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
            WhatsApp (DDD)
          </span>
          <input
            className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
            defaultValue={profile.whatsapp ?? ""}
            name="whatsapp"
            placeholder="WhatsApp com DDD"
          />
        </label>
        <p className="sm:col-span-2 rounded-2xl border border-slate-200/80 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-400">
          Comissão por conta segue o valor{" "}
          <strong className="text-slate-800 dark:text-slate-200">global</strong> do papel (captador
          ou operador), em{" "}
          <Link
            className="font-bold text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
            href="/admin/comissoes"
          >
            Comissões globais
          </Link>
          .
        </p>
        <Button className="sm:col-span-2" type="submit" variant="secondary">
          Salvar alterações
        </Button>
      </form>

      {profile.role === "captador" ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-xs text-slate-600 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-400">
          Regra de depósito no envio agora é definida em{" "}
          <Link className="font-bold text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400" href="/admin/ofertas">
            Ofertas
          </Link>
          .
        </div>
      ) : null}

      {dangerZone === "prominent" ? (
        <div className="mt-1">{deleteForm}</div>
      ) : (
        <details
          aria-label="Exclusão de usuário. Abra apenas se for remover este perfil."
          className="group/danger rounded-2xl border border-rose-500/15 bg-rose-950/[0.12] open:border-rose-400/25 open:bg-rose-950/20"
        >
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-2xl px-3 py-2.5 text-xs font-bold text-rose-200/90 transition-colors hover:bg-rose-500/10 hover:text-rose-100 [&::-webkit-details-marker]:hidden">
            <span>Zona de exclusão — expandir só se for excluir</span>
            <span
              aria-hidden
              className="text-[10px] text-rose-300/80 transition-transform group-open/danger:rotate-180"
            >
              ▼
            </span>
          </summary>
          <div className="border-t border-rose-500/15 px-3 py-3">{deleteForm}</div>
        </details>
      )}
    </div>
  );
}
