import { ApproveCaptadorButton } from "@/components/admin/approve-captador-button";
import { ProfileAdminEditor } from "@/components/admin/profile-admin-editor";
import type { CaptadorSubmissionBrief, Profile } from "@/lib/types";

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

function depositPill(hasBrief: boolean) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide ${
        hasBrief
          ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/25"
          : "bg-white/5 text-zinc-500 ring-1 ring-white/10"
      }`}
    >
      {hasBrief ? "Depósito" : "Sem depósito"}
    </span>
  );
}

export function CaptadorAdminListItem({
  profile,
  depositBrief,
}: {
  profile: Profile;
  depositBrief: CaptadorSubmissionBrief | null;
}) {
  const displayName = profile.name?.trim() || profile.email || "Sem nome";
  const hasDepositBrief = Boolean(depositBrief);

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
            {depositPill(hasDepositBrief)}
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
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 sm:p-5">
          <ProfileAdminEditor dangerZone="collapsed" depositBrief={depositBrief} profile={profile} />
        </div>
      </div>
    </details>
  );
}
