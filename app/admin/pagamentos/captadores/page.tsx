import { PaymentsByRoleView } from "@/app/admin/pagamentos/_components/payments-by-role";

export const dynamic = "force-dynamic";

export default async function AdminPagamentosCaptadoresPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const params = await searchParams;
  return <PaymentsByRoleView role="captador" searchParams={params} />;
}
