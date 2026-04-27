import { CopyLinkButton } from "@/components/admin/copy-link-button";
import { Button } from "@/components/ui/button";
import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import {
  createRegistrationLinkAction,
  updateRegistrationLinkStatusAction,
} from "@/lib/actions/domain";
import { requireRole } from "@/lib/auth";
import { buildReferralUrl, getReferralSettings } from "@/lib/referrals";
import { createClient } from "@/lib/supabase/server";
import type { AppSetting, Profile, RegistrationLink } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminLinksPage() {
  const profile = await requireRole(["admin"]);
  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const [{ data: links }, { data: captadores }, { data: settings }] = await Promise.all([
    supabase
      .from("registration_links")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<RegistrationLink[]>(),
    supabase
      .from("profiles")
      .select("id,name,email,role,instagram,whatsapp,pix_key,referral_code,referred_by,status,referral_bonus_paid,captador_commission_override,operator_commission_override,registration_link_id,created_at,updated_at")
      .eq("role", "captador")
      .eq("status", "active")
      .order("name")
      .returns<Profile[]>(),
    supabase
      .from("app_settings")
      .select("key,value")
      .in("key", ["referral_utm_source", "referral_utm_medium", "referral_utm_campaign"])
      .returns<AppSetting[]>(),
  ]);
  const referralSettings = getReferralSettings(settings);

  return (
    <RoleBasedLayout
      description="Crie links rastreáveis para cadastro, campanhas, origem e indicação."
      profile={profile}
      title="Links de cadastro"
    >
      <form
        action={createRegistrationLinkAction}
        className="mb-6 grid gap-4 rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900/80 lg:grid-cols-3"
      >
        <input className="min-h-12 rounded-2xl border border-slate-200 px-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-white" name="label" placeholder="Nome do link" required />
        <input className="min-h-12 rounded-2xl border border-slate-200 px-4 uppercase dark:border-white/10 dark:bg-slate-950/70 dark:text-white" name="code" placeholder="CODIGO" required />
        <select className="min-h-12 rounded-2xl border border-slate-200 px-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-white" name="role" defaultValue="captador">
          <option value="captador">Captador</option>
          <option value="operator">Operador</option>
        </select>
        <input className="min-h-12 rounded-2xl border border-slate-200 px-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-white" name="origin" placeholder="Origem" />
        <input className="min-h-12 rounded-2xl border border-slate-200 px-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-white" name="campaign" placeholder="Campanha" />
        <select className="min-h-12 rounded-2xl border border-slate-200 px-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-white" name="captadorId" defaultValue="">
          <option value="">Sem captador vinculado</option>
          {captadores?.map((captador) => (
            <option key={captador.id} value={captador.id}>
              {captador.name ?? captador.email}
            </option>
          ))}
        </select>
        <input className="min-h-12 rounded-2xl border border-slate-200 px-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-white" name="captadorCommissionOverride" placeholder="Override campanha (opcional)" step="0.01" type="number" />
        <input className="min-h-12 rounded-2xl border border-slate-200 px-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-white" name="expiresAt" type="datetime-local" />
        <input className="min-h-12 rounded-2xl border border-slate-200 px-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-white" name="maxUses" placeholder="Limite de usos" type="number" />
        <Button type="submit">Criar link</Button>
      </form>

      <div className="grid gap-4 lg:grid-cols-2">
        {links?.map((link) => {
          const finalUrl =
            link.role === "captador"
              ? buildReferralUrl({
                  appUrl,
                  code: link.code,
                  utmCampaign: link.campaign ?? referralSettings.utmCampaign,
                  utmMedium: link.origin ?? referralSettings.utmMedium,
                  utmSource: referralSettings.utmSource,
                })
              : `${appUrl}/register?ref=${link.code}`;

          return (
          <article
            className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900/80"
            key={link.id}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-black text-slate-950 dark:text-white">{link.label}</p>
                <p className="mt-1 break-all text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  {finalUrl}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-white/10 dark:text-slate-200">
                {link.status}
              </span>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {link.origin ?? "sem origem"} · {link.campaign ?? "sem campanha"} ·{" "}
              {link.uses_count}/{link.max_uses ?? "sem limite"} usos
            </p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Expira: {link.expires_at ? new Date(link.expires_at).toLocaleString("pt-BR") : "sem expiração"}
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Valor por conta:{" "}
              {link.captador_commission_override
                ? Number(link.captador_commission_override).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })
                : "usa comissão global do captador"}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <CopyLinkButton url={finalUrl} />
              <form action={updateRegistrationLinkStatusAction}>
              <input name="linkId" type="hidden" value={link.id} />
              <input
                name="status"
                type="hidden"
                value={link.status === "active" ? "inactive" : "active"}
              />
              <Button type="submit" variant="secondary">
                {link.status === "active" ? "Desativar" : "Ativar"}
              </Button>
            </form>
            </div>
          </article>
          );
        })}
      </div>
    </RoleBasedLayout>
  );
}
