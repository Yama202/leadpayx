/** Remove metacaracteres de LIKE e separadores que quebram o parser do `.or()` do PostgREST. */
export function sanitizeIlikeSearchTerm(raw: string): string {
  return raw
    .trim()
    .replace(/[%_,()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Aspas duplas para valores em filtros PostgREST (`.or()`), com escape de `"` interno. */
export function quotePostgrestFilterValue(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '""')}"`;
}
