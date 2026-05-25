"use server";

import { createHash, timingSafeEqual } from "node:crypto";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  formDataToObject,
  initialActionState,
  prefixTestPurgeSchema,
  validationError,
  type ActionState,
} from "@/lib/validation";

function verifyPurgeSecret(provided: string, configured: string): boolean {
  const a = createHash("sha256").update(provided, "utf8").digest();
  const b = createHash("sha256").update(configured, "utf8").digest();
  return timingSafeEqual(a, b);
}

function parsePurgeRpcPayload(data: unknown): {
  removed_accounts: number;
  removed_earnings: number;
  removed_payout_earnings_rows: number;
  removed_empty_payouts: number;
  removed_notifications: number;
  removed_audit_rows: number;
  account_print_paths: string[];
} {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {
      removed_accounts: 0,
      removed_earnings: 0,
      removed_payout_earnings_rows: 0,
      removed_empty_payouts: 0,
      removed_notifications: 0,
      removed_audit_rows: 0,
      account_print_paths: [],
    };
  }

  const o = data as Record<string, unknown>;
  const pathsRaw = o.account_print_paths;
  const paths = Array.isArray(pathsRaw)
    ? pathsRaw.filter((p): p is string => typeof p === "string" && p.length > 0)
    : [];

  const n = (k: string) =>
    typeof o[k] === "number" && Number.isFinite(o[k] as number) ? Math.trunc(o[k] as number) : 0;

  return {
    removed_accounts: n("removed_accounts"),
    removed_earnings: n("removed_earnings"),
    removed_payout_earnings_rows: n("removed_payout_earnings_rows"),
    removed_empty_payouts: n("removed_empty_payouts"),
    removed_notifications: n("removed_notifications"),
    removed_audit_rows: n("removed_audit_rows"),
    account_print_paths: paths,
  };
}

export async function purgePrefixTestAccountsAction(
  stateOrFormData: ActionState | FormData = initialActionState,
  maybeFormData?: FormData,
): Promise<ActionState> {
  const formData = maybeFormData ?? (stateOrFormData as FormData);
  await requireRole(["admin"]);

  const configured = process.env.LEADPAY_PREFIX_TEST_PURGE_SECRET?.trim();
  if (!configured?.length) {
    return {
      ok: false,
      message:
        "LEADPAY_PREFIX_TEST_PURGE_SECRET não configurada no servidor. Defina a variável na Vercel (Production) ou em .env.local.",
    };
  }

  const parsed = prefixTestPurgeSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return validationError("Confirme os dados antes de executar.", parsed.error);
  }

  if (!verifyPurgeSecret(parsed.data.purgePassword, configured)) {
    return { ok: false, message: "Senha incorreta." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_purge_prefix_test_accounts");

  if (error) {
    console.error("[purgePrefixTestAccountsAction] rpc failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    const msg = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();
    if (msg.includes("admin required")) {
      return {
        ok: false,
        message: "Permissão recusada: o Supabase não viu-te como administrador nesta sessão. Sai e volta a entrar com uma conta admin no mesmo projeto (URL) das variáveis da Vercel.",
      };
    }
    if (
      error.code === "PGRST202" ||
      msg.includes("could not find the function") ||
      msg.includes("admin_purge_prefix_test_accounts")
    ) {
      return {
        ok: false,
        message:
          'A função SQL admin_purge_prefix_test_accounts não existe neste projeto Supabase (ou o schema ainda não foi atualizado). No Supabase Dashboard → SQL, executa o ficheiro supabase/migrations/20260503200000_admin_purge_prefix_test_accounts.sql. Confirma que NEXT_PUBLIC_SUPABASE_URL na Vercel aponta para este mesmo projeto.',
      };
    }
    if (
      msg.includes("foreign key") ||
      msg.includes("violates foreign key constraint") ||
      msg.includes("23503")
    ) {
      return {
        ok: false,
        message:
          "A base recusou apagar porque ainda há tabelas ligadas a estas contas. Copia o texto do erro do log do servidor ou da consola Postgres e atualiza o script de migração; ou contacta suporte técnico.",
      };
    }
    if (msg.includes("invalid input syntax for type uuid") || msg.includes("22p02")) {
      return {
        ok: false,
        message:
          "Erro ao processar dados ligados às contas (ex.: UUID inválido em notificações). Faz redeploy depois da última migração de limpeza (versão que valida IDs) ou corrige linhas órfãs no SQL Editor.",
      };
    }
    return {
      ok: false,
      message: `Não foi possível executar a limpeza. Código Supabase/Postgres: ${error.code ?? "—"} — ${error.message}. Confirma migrações no projeto (admin_purge_prefix_test_accounts) e variáveis na Vercel.`,
    };
  }

  const stats = parsePurgeRpcPayload(data);

  const printPaths = stats.account_print_paths;
  if (printPaths.length > 0) {
    try {
      const admin = createAdminClient();
      const bucket = admin.storage.from("account-prints");
      const chunkSize = 50;
      for (let i = 0; i < printPaths.length; i += chunkSize) {
        const chunk = printPaths.slice(i, i + chunkSize);
        const { error: rmErr } = await bucket.remove(chunk);
        if (rmErr) {
          console.warn("[purgePrefixTestAccountsAction] storage remove partial failure", rmErr.message);
        }
      }
    } catch (e) {
      console.warn("[purgePrefixTestAccountsAction] storage cleanup error", e);
    }
  }

  const stalePaths = [
    "/admin",
    "/admin/dashboard",
    "/admin/configuracoes",
    "/admin/contas",
    "/admin/captadores",
    "/admin/operadores",
    "/admin/pagamentos",
    "/admin/pagamentos/captadores",
    "/admin/pagamentos/operadores",
    "/admin/logs",
    "/captador/dashboard",
    "/captador/minhas-contas",
    "/captador/pagamentos",
    "/captador/avisos",
    "/operador",
    "/operador/historico",
  ];

  for (const p of stalePaths) {
    revalidatePath(p);
  }

  const detail = [
    `${stats.removed_accounts} conta(s)`,
    `${stats.removed_earnings} ganho(s)`,
    `${stats.removed_payout_earnings_rows} vínculos em pagamentos`,
    `${stats.removed_empty_payouts} pagamento(s) vazio(s) removidos`,
    `${stats.removed_notifications} notificação(s)`,
    `${stats.removed_audit_rows} evento(s) de auditoria de conta`,
  ].join("; ");

  return {
    ok: true,
    message:
      stats.removed_accounts === 0
        ? 'Nenhuma conta correspondeu ao critério (rótulo/e-mail cuja parte local começa por "test"). Prefixos testimonial… e testing… são ignorados.'
        : `Limpeza concluída. ${detail}`,
  };
}
