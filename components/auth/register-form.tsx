"use client";

import Link from "next/link";

import { ActionForm, Field, SubmitButton } from "@/components/ui/forms";
import { registerAction } from "@/lib/actions/auth";
import { initialActionState } from "@/lib/validation";

export function RegisterForm({ registrationCode }: { registrationCode?: string }) {
  return (
    <ActionForm action={registerAction} initialState={initialActionState}>
      {(state) => (
        <>
          <Field
            error={state.fieldErrors?.name}
            label="Nome"
            name="name"
            placeholder="Seu nome completo"
            required
          />
          <Field
            error={state.fieldErrors?.email}
            label="E-mail"
            name="email"
            placeholder="voce@empresa.com"
            required
            type="email"
          />
          <Field
            error={state.fieldErrors?.password}
            label="Senha"
            name="password"
            required
            type="password"
          />
          {registrationCode ? (
            <p className="rounded-2xl bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-900 dark:bg-amber-400/10 dark:text-amber-200">
              Use uma senha simples e exclusiva do LeadPayX. Nunca use a senha
              real do seu e-mail.
            </p>
          ) : null}
          <input name="registrationCode" type="hidden" value={registrationCode ?? ""} />
          <SubmitButton>Criar cadastro</SubmitButton>
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Já tem acesso?{" "}
            <Link className="font-bold text-slate-950 dark:text-white" href="/login">
              Entrar
            </Link>
          </p>
        </>
      )}
    </ActionForm>
  );
}
