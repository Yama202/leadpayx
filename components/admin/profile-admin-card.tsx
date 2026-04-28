import Link from "next/link";

import { ClearDepositBriefButton } from "@/components/admin/clear-deposit-brief-button";
import { Button } from "@/components/ui/button";
import { adminUpdateProfileAction, upsertCaptadorDepositBriefAction } from "@/lib/actions/domain";
import { maskPixKeyForAdmin } from "@/lib/pix-key";
import { toCurrency } from "@/lib/payments";
import type { CaptadorSubmissionBrief, Profile } from "@/lib/types";

export function ProfileAdminCard({
  profile,
  depositBrief,
}: {
  profile: Profile;
  depositBrief?: CaptadorSubmissionBrief | null;
}) {
  const instagramHandle = profile.instagram?.trim().replace(/^@+/, "") ?? "";
  const instagramUrl = instagramHandle ? `https://instagram.com/${instagramHandle}` : null;
  const whatsappDigits = profile.whatsapp?.replace(/\D/g, "") ?? "";
  const whatsappUrl = whatsappDigits ? `https://wa.me/${whatsappDigits}` : null;
  const pixQrUrl = profile.pix_key
    ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(profile.pix_key)}`
    : null;

  return (
    <article className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900/80">
      <p className="text-lg font-black text-slate-950 dark:text-white">
        {profile.name ?? profile.email}
      </p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{profile.email}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {instagramUrl ? (
          <Link
            className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:bg-slate-900"
            href={instagramUrl}
            rel="noreferrer"
            target="_blank"
          >
            Instagram
          </Link>
        ) : null}
        {whatsappUrl ? (
          <Link
            className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/15"
            href={whatsappUrl}
            rel="noreferrer"
            target="_blank"
          >
            WhatsApp
          </Link>
        ) : null}
        {pixQrUrl ? (
          <Link
            className="rounded-xl border border-indigo-300 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-400/30 dark:bg-indigo-500/10 dark:text-indigo-200 dark:hover:bg-indigo-500/15"
            href={pixQrUrl}
            rel="noreferrer"
            target="_blank"
          >
            QR Pix
          </Link>
        ) : null}
      </div>
      {profile.role === "captador" ? (
        <p className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
          Pix (mascarado):{" "}
          <span className="font-mono text-slate-800 dark:text-slate-200">
            {maskPixKeyForAdmin(profile.pix_key)}
          </span>
        </p>
      ) : null}
      <form action={adminUpdateProfileAction} className="mt-5 grid gap-3 sm:grid-cols-2">
        <input name="profileId" type="hidden" value={profile.id} />
        <select
          className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
          defaultValue={profile.role}
          name="role"
        >
          <option value="captador">Captador</option>
          <option value="operator">Operador</option>
        </select>
        <select
          className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
          defaultValue={profile.status}
          name="status"
        >
          <option value="active">Ativo</option>
          <option value="inactive">Inativo</option>
        </select>
        <input
          className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
          defaultValue={profile.whatsapp ?? ""}
          name="whatsapp"
          placeholder="WhatsApp com DDD"
        />
        <p className="sm:col-span-2 rounded-2xl border border-slate-200/80 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-400">
          Comissão por conta segue o valor{" "}
          <strong className="text-slate-800 dark:text-slate-200">global</strong> do papel (captador
          ou operador), em{" "}
          <Link className="font-bold text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400" href="/admin/comissoes">
            Comissões globais
          </Link>
          . Campanhas podem usar override apenas no link de cadastro.
        </p>
        <Button className="sm:col-span-2" type="submit" variant="secondary">
          Salvar
        </Button>
      </form>
      {profile.role === "captador" ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-slate-950/50">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">
            Exigir depósito no envio
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            O captador vê aviso em Início e Enviar conta. Valor mínimo em BRL.
          </p>
          {depositBrief ? (
            <p className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-100">
              Ativo: mín. {toCurrency(Number(depositBrief.min_deposit_brl))}
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Nenhuma exigência ativa.</p>
          )}
          <form action={upsertCaptadorDepositBriefAction} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
            <input name="captadorId" type="hidden" value={profile.id} />
            <label className="block min-w-0 flex-1">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Valor mín. (BRL)</span>
              <input
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
                defaultValue={depositBrief ? String(depositBrief.min_deposit_brl) : "100"}
                min={0.01}
                name="minDepositBrl"
                required
                step="0.01"
                type="number"
              />
            </label>
            <Button className="min-h-11 shrink-0" type="submit" variant="secondary">
              Aplicar
            </Button>
          </form>
          {depositBrief ? (
            <div className="mt-2">
              <ClearDepositBriefButton captadorId={profile.id}>Remover exigência</ClearDepositBriefButton>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
