import type { ReactNode } from "react";

import { accountStatusLabel, earningStatusLabel } from "@/lib/constants";
import type { AccountStatus, EarningStatus } from "@/lib/types";

export function DashboardCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[2rem] border border-white/[0.08] bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <p className="text-sm font-semibold text-[#A1A1AA]">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-white">{value}</p>
      {hint ? <p className="mt-2 text-sm leading-6 text-[#A1A1AA]">{hint}</p> : null}
    </div>
  );
}

const statusClasses: Record<AccountStatus | EarningStatus, string> = {
  pending: "bg-amber-300/10 text-amber-100 ring-amber-200/20",
  assigned: "bg-sky-300/10 text-sky-100 ring-sky-200/20",
  in_progress: "bg-violet-300/10 text-violet-100 ring-violet-200/20",
  completed: "bg-[#00E07A]/10 text-[#16F28A] ring-[#00E07A]/20",
  rejected: "bg-rose-400/10 text-rose-100 ring-rose-400/20",
  rejected_no_balance: "bg-amber-400/15 text-amber-200 ring-amber-400/25",
  rejected_no_facial: "bg-amber-400/15 text-amber-200 ring-amber-400/25",
  wrong_password: "bg-orange-500/15 text-orange-300 ring-orange-400/25",
  paid: "bg-[#00E07A]/10 text-[#16F28A] ring-[#00E07A]/20",
  canceled: "bg-slate-400/10 text-slate-200 ring-slate-400/20",
};

export function StatusBadge({ status }: { status: AccountStatus | EarningStatus }) {
  const label =
    status in accountStatusLabel
      ? accountStatusLabel[status as AccountStatus]
      : earningStatusLabel[status as EarningStatus];

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusClasses[status]}`}
    >
      {label}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[2rem] border border-dashed border-white/[0.12] bg-white/[0.035] p-8 text-center shadow-xl shadow-black/20 backdrop-blur-xl">
      <div className="mx-auto mb-4 h-12 w-12 rounded-2xl bg-[#00E07A]/10 shadow-[0_0_28px_rgba(0,224,122,0.12)]" />
      <h3 className="text-lg font-black tracking-tight text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#A1A1AA]">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="rounded-[2rem] border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-xl">
      <div className="h-4 w-32 animate-pulse rounded-full bg-[#00E07A]/10" />
      <div className="mt-4 h-20 animate-pulse rounded-3xl bg-white/10" />
      <p className="mt-4 text-sm font-semibold text-slate-400">{label}</p>
    </div>
  );
}
