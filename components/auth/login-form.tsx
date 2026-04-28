"use client";

import Link from "next/link";

import { ActionForm, Field, SubmitButton } from "@/components/ui/forms";
import { loginAction } from "@/lib/actions/auth";
import { initialActionState } from "@/lib/validation";

export function LoginForm({ registerHref = "/register" }: { registerHref?: string }) {
  return (
    <ActionForm action={loginAction} initialState={initialActionState}>
      {(state) => (
        <>
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
          <SubmitButton>Entrar</SubmitButton>
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Ainda não tem acesso?{" "}
            <Link className="font-bold text-slate-950 dark:text-white" href={registerHref}>
              Criar cadastro
            </Link>
          </p>
        </>
      )}
    </ActionForm>
  );
}
