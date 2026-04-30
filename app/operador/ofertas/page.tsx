import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function OperadorOfertasPage() {
  await requireRole(["operator"]);
  redirect("/operador/dashboard");
}
