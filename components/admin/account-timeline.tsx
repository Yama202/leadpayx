const ACTION_LABEL: Record<string, string> = {
  "account.submitted": "Enviada pelo captador",
  "account.assigned": "Atribuída ao operador",
  "account.started": "Operação iniciada",
  "account.operation_started": "Operação iniciada",
  "account.completed": "Concluída",
  "account.operation_completed": "Concluída",
  "account.rejected": "Recusada",
  "account.requeued": "Devolvida à fila",
  "account.sla_reassigned": "Reatribuída (SLA)",
};

const ACTION_COLOR: Record<string, string> = {
  "account.submitted": "border-zinc-400/40 bg-zinc-400/10 text-zinc-300",
  "account.assigned": "border-blue-400/40 bg-blue-400/10 text-blue-300",
  "account.started": "border-amber-400/40 bg-amber-400/10 text-amber-300",
  "account.operation_started": "border-amber-400/40 bg-amber-400/10 text-amber-300",
  "account.completed": "border-[#00E07A]/40 bg-[#00E07A]/10 text-[#16F28A]",
  "account.operation_completed": "border-[#00E07A]/40 bg-[#00E07A]/10 text-[#16F28A]",
  "account.rejected": "border-rose-400/40 bg-rose-400/10 text-rose-300",
  "account.requeued": "border-amber-400/40 bg-amber-400/10 text-amber-300",
  "account.sla_reassigned": "border-violet-400/40 bg-violet-400/10 text-violet-300",
};

const DOT_COLOR: Record<string, string> = {
  "account.submitted": "bg-zinc-400",
  "account.assigned": "bg-blue-400",
  "account.started": "bg-amber-400",
  "account.operation_started": "bg-amber-400",
  "account.completed": "bg-[#00E07A]",
  "account.operation_completed": "bg-[#00E07A]",
  "account.rejected": "bg-rose-400",
  "account.requeued": "bg-amber-300",
  "account.sla_reassigned": "bg-violet-400",
};

export type AccountAuditEvent = {
  id: string;
  action: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  user_id: string | null;
};

function eventDetail(event: AccountAuditEvent): string | null {
  const m = event.metadata ?? {};
  if (event.action === "account.rejected") {
    const reason = m.reason ?? m.rejection_reason;
    if (typeof reason === "string" && reason.trim()) return reason.slice(0, 80);
  }
  if (event.action === "account.submitted") {
    const dep = m.declared_deposit_brl;
    if (typeof dep === "number" && dep > 0) {
      return `Depósito declarado: R$ ${dep.toFixed(2).replace(".", ",")}`;
    }
  }
  return null;
}

export function AccountTimeline({ events }: { events: AccountAuditEvent[] }) {
  if (!events.length) {
    return (
      <p className="mt-3 text-xs text-zinc-600">Nenhum evento registrado.</p>
    );
  }

  const sorted = [...events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  return (
    <div className="mt-3">
      <p className="mb-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">
        Histórico
      </p>
      <ol className="relative border-l border-white/[0.07] pl-5 space-y-3">
        {sorted.map((ev, i) => {
          const label = ACTION_LABEL[ev.action] ?? ev.action;
          const pill = ACTION_COLOR[ev.action] ?? "border-zinc-500/30 bg-zinc-500/10 text-zinc-400";
          const dot = DOT_COLOR[ev.action] ?? "bg-zinc-500";
          const detail = eventDetail(ev);
          const isLast = i === sorted.length - 1;
          return (
            <li className="relative" key={ev.id}>
              <span
                className={`absolute -left-[1.1rem] top-[0.35rem] h-2.5 w-2.5 rounded-full border-2 border-black ${dot} ${isLast ? "ring-2 ring-offset-1 ring-offset-black ring-current" : ""}`}
              />
              <div className="flex flex-wrap items-start gap-2">
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${pill}`}>
                  {label}
                </span>
                <span className="text-[10px] text-zinc-600">
                  {new Date(ev.created_at).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {detail ? (
                <p className="mt-0.5 text-[11px] text-zinc-500">{detail}</p>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
