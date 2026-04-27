import Link from "next/link";

import { Button } from "@/components/ui/button";
import { adminUpdateProfileAction } from "@/lib/actions/domain";
import type { Profile } from "@/lib/types";

export function ProfileAdminCard({ profile }: { profile: Profile }) {
  return (
    <article className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900/80">
      <p className="text-lg font-black text-slate-950 dark:text-white">
        {profile.name ?? profile.email}
      </p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{profile.email}</p>
      {profile.whatsapp ? (
        <p className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          WhatsApp: +{profile.whatsapp}
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
    </article>
  );
}
