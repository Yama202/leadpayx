import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminPagamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const params = await searchParams;
  const baseQuery = new URLSearchParams();
  if (params.start) {
    baseQuery.set("start", params.start);
  }
  if (params.end) {
    baseQuery.set("end", params.end);
  }
  const query = baseQuery.toString();
  redirect(query ? `/admin/pagamentos/captadores?${query}` : "/admin/pagamentos/captadores");
}
