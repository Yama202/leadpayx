import { ProfileAdminCard } from "@/components/admin/profile-admin-card";
import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminCaptadoresPage() {
  const profile = await requireRole(["admin"]);
  const supabase = await createClient();
  const { data: captadores } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "captador")
    .order("created_at", { ascending: false })
    .returns<Profile[]>();

  return (
    <RoleBasedLayout
      description="Gestão de captadores: papéis, status e contato. Comissões são globais (página Comissões)."
      profile={profile}
      title="Captadores"
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {captadores?.map((item) => <ProfileAdminCard key={item.id} profile={item} />)}
      </div>
    </RoleBasedLayout>
  );
}
