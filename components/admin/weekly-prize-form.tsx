"use client";

import { useActionState } from "react";
import { setWeeklyPrizeAction } from "@/lib/actions/domain";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = { ok: false, message: "" };

export function WeeklyPrizeForm({ active, description }: { active: boolean; description: string }) {
  const [state, formAction, pending] = useActionState(setWeeklyPrizeAction, initialState);
  const isActive = active;

  return (
    <div className={`rounded-[2rem] border p-5 transition-colors ${
      isActive ? "border-violet-400/40 bg-violet-500/[0.06]" : "border-white/10 bg-white/[0.04]"
    }`}>
      <div className="mb-4 flex items-center gap-3">
        <span className="text-2xl">🏆</span>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-zinc-500">Prêmio semanal</p>
          <p className="text-lg font-black text-white">Prêmio da semana</p>
        </div>
        {isActive ? (
          <span className="ml-auto rounded-full bg-violet-500/20 px-3 py-0.5 text-xs font-black text-violet-400">ATIVO</span>
        ) : (
          <span className="ml-auto rounded-full bg-zinc-800 px-3 py-0.5 text-xs font-black text-zinc-500">INATIVO</span>
        )}
      </div>

      <form action={formAction} className="space-y-4">
        <label className="flex cursor-pointer items-center gap-3">
          <div className="relative">
            <input className="peer sr-only" defaultChecked={active} name="active" type="checkbox" />
            <div className="h-6 w-11 rounded-full bg-zinc-700 transition-colors peer-checked:bg-violet-500" />
            <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
          </div>
          <span className="text-sm font-bold text-slate-200">Ativar prêmio da semana</span>
        </label>

        <label className="block">
          <span className="text-sm font-bold text-slate-200">Descrição do prêmio</span>
          <input
            className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
            defaultValue={description}
            maxLength={200}
            name="description"
            placeholder="ex: R$ 100 para quem trouxer mais esta semana!"
            type="text"
          />
        </label>

        {state.message ? (
          <p className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
            state.ok ? "border border-violet-500/30 bg-violet-500/10 text-violet-400" : "border border-red-500/30 bg-red-500/10 text-red-400"
          }`}>{state.message}</p>
        ) : null}

        <button
          className="w-full rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          disabled={pending}
          type="submit"
        >
          {pending ? "Salvando..." : "Salvar prêmio semanal"}
        </button>
      </form>

      {isActive && description ? (
        <div className="mt-4 rounded-2xl border border-violet-400/20 bg-violet-500/5 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-500">Preview</p>
          <p className="mt-1 text-sm font-black text-white">🏆 Prêmio da semana!</p>
          <p className="mt-0.5 text-xs text-zinc-300">{description}</p>
        </div>
      ) : null}
    </div>
  );
}
