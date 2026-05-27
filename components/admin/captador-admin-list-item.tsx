import { ApproveCaptadorButton } from "@/components/admin/approve-captador-button";
import { ProfileAdminEditor } from "@/components/admin/profile-admin-editor";
import type { Account, Profile } from "@/lib/types";

function statusPill(status: string | null | undefined) {
  if (status === "pending_approval") {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-amber-400/15 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide text-amber-300 ring-1 ring-amber-400/30">
        Pendente
      </span>
    );
  }
  const active = status === "active";
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide ${
        active
          ? "bg-[#00E07A]/15 text-[#16F28A] ring-1 ring-[#00E07A]/30"
          : "bg-white/10 text-zinc-400 ring-1 ring-white/10"
      }`}
    >
      {active ? "Ativo" : "Inativo"}
    </span>
  );
}

const ACCOUNT_STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  assigned: "Atribuída",
  in_progress: "Em andamento",
  completed: "Concluída",
  rejected: "Rejeitada",
};

const ACCOUNT_STATUS_CLASS: Record<string, string> = {
  pending: "bg-zinc-500/15 text-zinc-300 ring-1 ring-zinc-500/20",
  assigned: "bg-blue-500/15 text-blue-300 ring-1 ring-blue-400/25",
  in_progress: "bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/25",
  completed: "bg-[#00E07A]/12 text-[#16F28A] ring-1 ring-[#00E07A]/25",
  rejected: "bg-rose-500/12 text-rose-300 ring-1 ring-rose-400/20",
};

export function CaptadorAdminListItem({
  profile,
  accounts = [],
}: {
  profile: Profile;
  accounts?: Account[];
}) {
  const displayName = profile.name?.trim() || profile.email || "Sem nome";

  return (
    <details
      aria-label={`Captador ${displayName}, ${profile.email}. Abrir para editar perfil, depósito ou exclusão.`}
      className="group/cap overflow-hidden rounded-2xl border border-white/[0.1] bg-white/[0.04] shadow-lg shadow-black/20 backdrop-blur-md transition-[border-color,box-shadow] duration-200 open:border-[#00E07A]/25 open:shadow-[#00E07A]/8 open:shadow-xl"
    >
      <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3.5 text-left sm:items-center sm:gap-4 sm:px-5 sm:py-3 [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden
          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#00E07A]/12 text-sm font-black text-[#16F28A] sm:mt-0"
        >
          {(displayName[0] ?? "?").toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 gap-y-1">
            <span className="truncate text-base font-black tracking-tight text-white">{displayName}</span>
            {statusPill(profile.status)}
            {accounts.length > 0 ? (
              <span className="inline-flex shrink-0 items-center rounded-full bg-white/8 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide text-zinc-400 ring-1 ring-white/10">
                {accounts.length} {accounts.length === 1 ? "conta" : "contas"}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-sm text-zinc-400">{profile.email}</p>
        </div>
        <span className="flex shrink-0 items-center gap-1 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500 group-open/cap:text-[#16F28A]">
          <span className="hidden sm:inline">Detalhes</span>
          <svg
            aria-hidden
            className="h-5 w-5 text-zinc-400 transition-transform duration-200 group-open/cap:rotate-180 group-open/cap:text-[#16F28A]"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </summary>
      <div className="border-t border-white/[0.08] bg-black/20 px-4 py-5 sm:px-5">
        {profile.status === "pending_approval" ? (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/[0.07] px-4 py-3">
            <p className="text-sm text-amber-200/90">
              Este captador ainda não foi aprovado e não tem acesso ao painel.
            </p>
            <ApproveCaptadorButton profileId={profile.id} />
          </div>
        ) : null}
        {accounts.length > 0 ? (
          <div className="mb-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
            <p className="px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] text-zinc-500 border-b border-white/[0.06]">
              Contas enviadas · {accounts.length}
            </p>
            <div className="divide-y divide-white/[0.05]">
              {accounts.map((acc) => (
                <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-4" key={acc.id}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">{acc.account_identifier}</p>
                    <p className="truncate text-xs text-zinc-400">{acc.lead_account_email ?? "—"}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide ${ACCOUNT_STATUS_CLASS[acc.status] ?? "bg-zinc-500/15 text-zinc-300"}`}>
                      {ACCOUNT_STATUS_LABEL[acc.status] ?? acc.status}
                    </span>
                    <span className="text-[11px] text-zinc-600">
                      {new Date(acc.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-4 rounded-2xl border border-dashed border-white/[0.07] px-4 py-3 text-xs text-zinc-600">
            Nenhuma conta enviada ainda.
          </div>
        )}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 sm:p-5">
          <ProfileAdminEditor dangerZone="collapsed" profile={profile} />
        </div>
      </div>
    </details>
  );
}
