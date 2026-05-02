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
          <Field
            error={state.fieldErrors?.instagram}
            label="Nome no Instagram"
            name="instagram"
            placeholder="@seuperfil"
          />
          <Field
            error={state.fieldErrors?.cpf}
            label="CPF"
            name="cpf"
            placeholder="000.000.000-00"
            required
          />
          <Field
            error={state.fieldErrors?.pixKey}
            label="Chave Pix"
            name="pixKey"
            placeholder="CPF, e-mail, celular ou chave aleatória"
            required
          />
          <Field
            defaultValue={registrationCode ?? ""}
            error={state.fieldErrors?.registrationCode}
            label="Código de indicação"
            name="registrationCode"
            placeholder="Opcional"
            readOnly={Boolean(registrationCode)}
          />
          <div className="rounded-2xl border border-[#00E07A]/15 bg-[#00E07A]/5 p-3 text-sm leading-6 text-zinc-300">
            <p className="font-semibold text-[#16F28A]">Indicação é opcional.</p>
            <p className="mt-1">
              Se você recebeu um link, o código já vem aplicado. Sem link, use
              este campo como fallback manual. Use
              uma senha simples e exclusiva do LeadPayX; nunca use a senha real do
              seu e-mail.
            </p>
          </div>
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
