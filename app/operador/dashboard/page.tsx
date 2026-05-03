import { Suspense } from "react";

import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { requireRole } from "@/lib/auth";

import { OperadorDashboardData } from "./operator-dashboard-data";
import { OperadorDashboardSkeleton } from "./operator-dashboard-skeleton";

export const dynamic = "force-dynamic";

export default async function OperadorDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ op_error?: string }>;
}) {
  const profile = await requireRole(["operator"]);
  const params = await searchParams;

  return (
    <RoleBasedLayout description="Pegue lote, processe e finalize contas." profile={profile} title="Fila do operador">
      <Suspense fallback={<OperadorDashboardSkeleton />}>
        <OperadorDashboardData opError={params.op_error} profile={profile} />
      </Suspense>
    </RoleBasedLayout>
  );
}
