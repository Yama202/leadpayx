import {
  EditCaptadorGlobalOfferForm,
  NewCaptadorGlobalOfferForm,
  ToggleCaptadorGlobalOfferForm,
} from "@/components/admin/captador-global-offers-admin-forms";
import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CaptadorGlobalOffer } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminLinksOperacaoPage() {
  const profile = await requireRole(["admin"]);
  const supabase = await createClient();
  const { data: offers } = await supabase
    .from("captador_global_offers")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<CaptadorGlobalOffer[]>();

  return (
    <RoleBasedLayout
      description="Links externos de operação visíveis a todos os captadores. Somente administradores gerenciam; operadores não têm acesso."
      profile={profile}
      title="Links de operação (captadores)"
    >
      <section className="mb-6 rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900/80">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#16F28A]">Novo link</p>
        <p className="mt-2 text-sm leading-6 text-[#A1A1AA]">
          Cadastre URLs HTTPS. Parâmetros UTM serão aplicados automaticamente no painel do captador (sem sobrescrever query
          operacional que não seja utm_*).
        </p>
        <div className="mt-4">
          <NewCaptadorGlobalOfferForm />
        </div>
      </section>

      <div className="grid gap-4">
        {offers?.map((offer) => (
          <article
            className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900/80"
            key={offer.id}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-lg font-black text-slate-950 dark:text-white">{offer.name}</p>
                <p className="mt-1 break-all text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  {offer.url_base}
                </p>
              </div>
              <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-white/10 dark:text-slate-200">
                {offer.is_active ? "ativa" : "inativa"}
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Ordem: {offer.sort_order} · Criada em {new Date(offer.created_at).toLocaleString("pt-BR")}
            </p>
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-black text-emerald-700 dark:text-emerald-300">
                Editar
              </summary>
              <EditCaptadorGlobalOfferForm offer={offer} />
            </details>
            <div className="mt-4">
              <ToggleCaptadorGlobalOfferForm isActive={offer.is_active} offerId={offer.id} />
            </div>
          </article>
        ))}
      </div>
    </RoleBasedLayout>
  );
}
