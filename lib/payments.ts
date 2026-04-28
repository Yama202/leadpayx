export function toCurrency(value: number | string | null | undefined) {
  return Number(value ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function parsePeriod(searchParams: { start?: string; end?: string }) {
  const start = searchParams.start ? new Date(searchParams.start) : null;
  const end = searchParams.end ? new Date(searchParams.end) : null;

  return {
    start: start && !Number.isNaN(start.getTime()) ? start.toISOString() : null,
    end: end && !Number.isNaN(end.getTime()) ? end.toISOString() : null,
    startInput: searchParams.start ?? "",
    endInput: searchParams.end ?? "",
  };
}
