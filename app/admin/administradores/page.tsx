import { PromoteAdminForm, RevokeAdminForm } from "@/components/admin/admin-role-form";
import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

const bootstrapAdminEmail = "yamafonseca2003@gmail.com";

export const dynamic = "force-dynamic";

export default async function AdminAdministradoresPage() {
  const profile = await requireRole(["admin"]);
  const supabase = await createClient();
  const { data: admins } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "admin")
    .order("created_at", { ascending: true })
    .returns<Profile[]>();

  return (
    <RoleBasedLayout
      description="Promova e revogue administradores por um fluxo auditado. Mudanças diretas de role são bloqueadas no banco."
      profile={profile}
      title="Gestão de administradores"
    >
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-900/80">
          <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">
            Promover novo admin
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            O usuário precisa já existir no cadastro. A ação é validada no servidor,
            executada por RPC e registrada em auditoria.
          </p>
          <div className="mt-5">
            <PromoteAdminForm />
          </div>
        </section>

        <section className="space-y-4">
          {admins?.map((admin) => {
            const email = admin.email ?? "";
            const isBootstrapAdmin = email.toLowerCase() === bootstrapAdminEmail;
            const isCurrentUser = admin.id === profile.id;
            const revokeDisabled = isBootstrapAdmin || isCurrentUser;

            return (
              <article
                className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-950/5 backdrop-blur dark:border-white/10 dark:bg-slate-900/80"
                key={admin.id}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-lg font-black text-slate-950 dark:text-white">
                      {admin.name ?? email}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                      {email}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-400/20">
                    {isBootstrapAdmin ? "Super admin inicial" : "Admin"}
                  </span>
                </div>

                {revokeDisabled ? (
                  <p className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm font-semibold leading-6 text-slate-600 dark:bg-white/10 dark:text-slate-300">
                    {isBootstrapAdmin
                      ? "Este admin inicial não pode ser revogado pelo painel."
                      : "Você não pode revogar seu próprio acesso admin."}
                  </p>
                ) : (
                  <div className="mt-5">
                    <RevokeAdminForm email={email} />
                  </div>
                )}
              </article>
            );
          })}
        </section>
      </div>
    </RoleBasedLayout>
  );
}
