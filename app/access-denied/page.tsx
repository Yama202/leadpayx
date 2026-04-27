import { LinkButton } from "@/components/ui/button";

export default function AccessDeniedPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-950 px-4 text-white">
      <section className="max-w-md rounded-[2rem] border border-white/10 bg-white/10 p-8 text-center shadow-2xl backdrop-blur">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">
          Acesso negado
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-tight">
          Permissão insuficiente
        </h1>
        <p className="mt-4 text-sm leading-6 text-white/70">
          Esta área é restrita ao perfil autorizado. Entre com uma conta liberada
          para continuar.
        </p>
        <LinkButton className="mt-6" href="/login" variant="secondary">
          Voltar ao login
        </LinkButton>
      </section>
    </main>
  );
}
