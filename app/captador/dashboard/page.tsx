import { Suspense } from "react";

import { OfertasReminderPopup } from "@/components/domain/ofertas-reminder-popup";
import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { requireRole } from "@/lib/auth";

import { CaptadorDashboardData } from "./captador-dashboard-data";
import { CaptadorDashboardSkeleton } from "./captador-dashboard-skeleton";

export const dynamic = "force-dynamic";

export default async function CaptadorDashboardPage() {
  const profile = await requireRole(["captador"]);

  return (
    <RoleBasedLayout description="Contas, ganhos, links e Pix." profile={profile} title="Início">
      <OfertasReminderPopup />
      <Suspense fallback={<CaptadorDashboardSkeleton />}>
        <CaptadorDashboardData profile={profile} />
      </Suspense>
    </RoleBasedLayout>
  );
}
