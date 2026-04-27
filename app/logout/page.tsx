import { logoutAction } from "@/lib/actions/auth";
import { BackButton } from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default function LogoutPage() {
  return (
    <main className="dark relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#050706] px-4 py-8 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_24%,rgba(0,224,122,0.18),transparent_30%),linear-gradient(180deg,#050706_0%,#070909_56%,#030504_100%)]" />
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-50" />
      <div className="pointer-events-none absolute left-1/2 top-20 h-72 w-72 -translate-x-1/2 rounded-full bg-[#00E07A]/20 blur-[110px] sm:h-[32rem] sm:w-[32rem]" />
      <section className="relative z-10 w-full max-w-md rounded-[2rem] border border-white/[0.08] bg-white/[0.04] p-6 shadow-2xl shadow-black/35 backdrop-blur-xl">
        <p className="inline-flex rounded-full border border-[#00E07A]/25 bg-[#00E07A]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#16F28A]">
          Sessão
        </p>
        <h1 className="mt-6 text-3xl font-black tracking-tight text-white">
          Deseja sair do LeadPayX?
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#A1A1AA]">
          Ao confirmar, sua sessão local será encerrada e você voltará para a tela
          de login. Nenhum dado operacional será alterado.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <form action={logoutAction}>
            <Button className="w-full" type="submit" variant="danger">
              Confirmar saída
            </Button>
          </form>
          <BackButton className="w-full" fallbackHref="/" label="Cancelar" />
        </div>
      </section>
    </main>
  );
}
