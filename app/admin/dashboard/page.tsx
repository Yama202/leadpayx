import { Suspense } from "react";

import { RoleBasedLayout } from "@/components/layout/role-based-layout";
import { requireRole } from "@/lib/auth";

import { AdminDashboardData } from "./admin-dashboard-data";
import { AdminDashboardSkeleton } from "./admin-dashboard-skeleton";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  const profile = await requireRole(["admin"]);

  return (
    <RoleBasedLayout description="Operação, pagamentos e captação validada." profile={profile} title="Admin">
      <Suspense fallback={<AdminDashboardSkeleton />}>
        <AdminDashboardData periodParam={params.period} />
      </Suspense>
    </RoleBasedLayout>
  );
}
