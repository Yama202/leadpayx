"use client";

import { ActionForm, SubmitButton } from "@/components/ui/forms";
import { purgePrefixTestAccountsAction } from "@/lib/actions/purge-prefix-test-accounts";
import type { ActionState } from "@/lib/validation";
import { initialActionState } from "@/lib/validation";

export function PrefixTestAccountsPurgePanel() {
  return (
    <div className="rounded-[2rem] border border-rose-400/35 bg-white/85 p-5 shadow-xl shadow-slate-950/5 dark:border-rose-500/25 dark:bg-slate-900/80">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-600 dark:text-rose-300">
        Área destrutiva
      </p>
      <p className="mt-2 max-w-prose text-sm leading-6 text-slate-600 dark:text-slate-400">
        Remove apenas <strong className="text-slate-800 dark:text-slate-200">contas de teste</strong> cuja etiqueta ou a
        parte local do e‑mail operacional começa por <strong className="text-slate-800 dark:text-slate-200">test</strong>{" "}
        (ignora sequências tipo <strong className="font-mono text-xs">testimonial...</strong>,{" "}
        <strong className="font-mono text-xs">testing...</strong>). Apaga histórico associado nos extratos dos captadores,
        filas dos operadores e relatórios de admin ligados a essas linhas{" "}
        <span className="text-slate-500 dark:text-slate-400">
          sem eliminar utilizadores nem definições do sistema.
        </span>
      </p>

      <div className="mt-6">
        <ActionForm action={purgePrefixTestAccountsAction} initialState={initialActionState}>
          {(state: ActionState) => (
            <>
              <label className="block">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  Senha de confirmação da limpeza
                </span>
                <input
                  autoComplete="off"
                  className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 px-4 dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
                  name="purgePassword"
                  required
                  type="password"
                />
                {state.fieldErrors?.purgePassword?.[0] ? (
                  <span className="mt-2 block text-sm text-rose-600 dark:text-rose-300">
                    {state.fieldErrors.purgePassword[0]}
                  </span>
                ) : null}
              </label>
              <p className="text-xs leading-5 text-slate-500 dark:text-slate-500">
                Configure no servidor:{" "}
                <code className="rounded bg-black/5 px-1 dark:bg-white/10">LEADPAY_PREFIX_TEST_PURGE_SECRET</code> —
                nunca aparece ao utilizador nem no cliente.
              </p>
              <SubmitButton pendingLabel="A limpar dados de teste…" variant="danger">
                Apagar contas de teste (prefixo &quot;test…&quot;)
              </SubmitButton>
            </>
          )}
        </ActionForm>
      </div>
    </div>
  );
}
