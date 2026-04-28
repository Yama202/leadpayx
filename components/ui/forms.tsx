"use client";

import type { FormHTMLAttributes, ReactNode } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/validation";

export function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
  readOnly,
  defaultValue,
  error,
  step,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  readOnly?: boolean;
  defaultValue?: string;
  error?: string[];
  step?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-zinc-200">{label}</span>
      <input
        className="mt-2 min-h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 text-base text-white outline-none transition-colors duration-200 placeholder:text-zinc-500 focus:border-[#00E07A] focus:ring-4 focus:ring-[#00E07A]/10"
        defaultValue={defaultValue}
        name={name}
        placeholder={placeholder}
        readOnly={readOnly}
        required={required}
        step={step}
        type={type}
      />
      {error?.[0] ? <span className="mt-2 block text-sm text-rose-300">{error[0]}</span> : null}
    </label>
  );
}

export function TextArea({
  label,
  name,
  placeholder,
  error,
}: {
  label: string;
  name: string;
  placeholder?: string;
  error?: string[];
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-zinc-200">{label}</span>
      <textarea
        className="mt-2 min-h-28 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-base text-white outline-none transition-colors duration-200 placeholder:text-zinc-500 focus:border-[#00E07A] focus:ring-4 focus:ring-[#00E07A]/10"
        name={name}
        placeholder={placeholder}
      />
      {error?.[0] ? <span className="mt-2 block text-sm text-rose-300">{error[0]}</span> : null}
    </label>
  );
}

export function SubmitButton({ children }: { children: string }) {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" disabled={pending} type="submit">
      {pending ? "Processando..." : children}
    </Button>
  );
}

export function ActionForm({
  action,
  initialState,
  encType,
  children,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  initialState: ActionState;
  /** Use `multipart/form-data` quando houver upload de arquivo no formulário. */
  encType?: FormHTMLAttributes<HTMLFormElement>["encType"];
  children: (state: ActionState) => ReactNode;
}) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-5" encType={encType}>
      {children(state)}
      {state.message ? (
        <p
          className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
            state.ok
            ? "bg-[#00E07A]/10 text-[#16F28A]"
            : "bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-200"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
