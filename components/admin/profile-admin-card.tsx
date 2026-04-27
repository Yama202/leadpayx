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
        <input
          className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
          defaultValue={profile.captador_commission_override ?? ""}
          name="captadorCommissionOverride"
          placeholder="Comissão captador"
          type="number"
          step="0.01"
        />
        <input
          className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
          defaultValue={profile.operator_commission_override ?? ""}
          name="operatorCommissionOverride"
          placeholder="Comissão operador"
          type="number"
          step="0.01"
        />
        <Button type="submit" variant="secondary">
          Salvar
        </Button>
      </form>
    </article>
  );
}
