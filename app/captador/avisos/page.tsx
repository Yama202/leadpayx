import Link from "next/link";

import { CaptadorNotificationsSection } from "@/components/domain/captador-notifications-section";
import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { UserNotification } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CaptadorAvisosPage() {
  const profile = await requireRole(["captador"]);
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("user_notifications")
    .select("id,user_id,kind,title,body,metadata,read_at,created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const notifications = (rows ?? []) as UserNotification[];

  return (
    <RoleBasedLayout
      description="Comissões creditadas quando o operador finaliza suas contas (valor conforme admin / link de captação)."
      profile={profile}
      title="Avisos"
    >
      <p className="mb-4 text-xs text-zinc-500">
        Prefere alertas no celular? Ative em{" "}
        <Link className="font-semibold text-[#16F28A] hover:underline" href="/captador/dashboard">
          Início
        </Link>{" "}
        (secção &quot;Ativar notificações&quot;).
      </p>
      <CaptadorNotificationsSection compact={false} notifications={notifications} />
    </RoleBasedLayout>
  );
}
