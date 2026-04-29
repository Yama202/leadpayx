import type { PostgrestError } from "@supabase/supabase-js";

const COLUMN_MISSING_REGEX =
  /column\s+(?:[\w.]+\.)?(\w+)\s+does\s+not\s+exist|Could not find the '(\w+)' column/i;

/**
 * Texto curto para UI quando um SELECT PostgREST falha (ex.: 42703), sem expor linhas/dados.
 */
export function publicPostgrestSelectHint(error: PostgrestError): string | null {
  const raw = [error.message, error.details, error.hint].filter(Boolean).join(" ");
  const m = raw.match(COLUMN_MISSING_REGEX);
  const col = m?.[1] ?? m?.[2];
  if (col && /^[a-z_][a-z0-9_]*$/i.test(col)) {
    return `Coluna ausente ou indisponível no schema: ${col}.`;
  }
  if (error.code === "42703") {
    return "Coluna referenciada não existe no banco (schema desatualizado).";
  }
  return null;
}
