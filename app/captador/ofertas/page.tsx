import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CaptadorOfertasPage() {
  await requireRole(["captador"]);
  redirect("/captador/dashboard");
}
