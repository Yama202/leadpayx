import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { EmptyState } from "@/components/ui/cards";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminLogsPage() {
  const profile = await requireRole(["admin"]);
  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <RoleBasedLayout
      description="Eventos críticos de atribuição, conclusão, bônus e pagamentos."
      profile={profile}
      title="Logs"
    >
      <div className="space-y-3">
        {logs?.length ? (
          logs.map((log) => (
            <article
              className="rounded-2xl border border-white/70 bg-white/85 p-4 text-sm shadow-lg shadow-slate-950/5"
              key={log.id}
            >
              <p className="font-black text-slate-950">{log.action}</p>
              <p className="mt-1 text-slate-500">
                {log.entity_type} · {log.created_at}
              </p>
            </article>
          ))
        ) : (
          <EmptyState description="Eventos auditáveis aparecerão aqui." title="Sem logs" />
        )}
      </div>
    </RoleBasedLayout>
  );
}
