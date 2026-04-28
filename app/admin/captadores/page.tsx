import { ProfileAdminCard } from "@/components/admin/profile-admin-card";
import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CaptadorSubmissionBrief, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminCaptadoresPage({
  searchParams,
}: {
  searchParams: Promise<{ profile_error?: string; profile_success?: string }>;
}) {
  const profile = await requireRole(["admin"]);
  const params = await searchParams;
  const supabase = await createClient();
  const [{ data: captadores }, { data: briefs }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("role", "captador")
      .order("created_at", { ascending: false })
      .returns<Profile[]>(),
    supabase.from("captador_submission_briefs").select("*").returns<CaptadorSubmissionBrief[]>(),
  ]);
  const briefById = new Map((briefs ?? []).map((b) => [b.captador_id, b]));

  return (
    <RoleBasedLayout
      description="Papéis, Pix mascarado, WhatsApp e exigência de depósito nos envios."
      profile={profile}
      title="Captadores"
    >
      {params.profile_error ? (
        <div className="mb-4 rounded-2xl border border-rose-300/40 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100">
          {params.profile_error}
        </div>
      ) : null}
      {params.profile_success ? (
        <div className="mb-4 rounded-2xl border border-emerald-300/40 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100">
          {params.profile_success}
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {captadores?.map((item) => (
          <ProfileAdminCard depositBrief={briefById.get(item.id) ?? null} key={item.id} profile={item} />
        ))}
      </div>
    </RoleBasedLayout>
  );
}
