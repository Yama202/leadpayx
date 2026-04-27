import Link from "next/link";

import { BrandMark } from "@/components/ui/brand";
import type { UserRole } from "@/lib/types";

const navItems: Record<UserRole, { href: string; label: string }[]> = {
  captador: [
    { href: "/captador/dashboard", label: "Início" },
    { href: "/captador/enviar-conta", label: "Enviar" },
    { href: "/captador/minhas-contas", label: "Contas" },
    { href: "/captador/indicacoes", label: "Indicações" },
    { href: "/captador/pagamentos", label: "Pagamentos" },
  ],
  operator: [
    { href: "/operador/dashboard", label: "Fila" },
    { href: "/operador/contas", label: "Contas" },
    { href: "/operador/historico", label: "Histórico" },
    { href: "/operador/pagamentos", label: "Pagamentos" },
  ],
  admin: [
    { href: "/admin/dashboard", label: "Visão geral" },
    { href: "/admin/captadores", label: "Captadores" },
    { href: "/admin/operadores", label: "Operadores" },
    { href: "/admin/administradores", label: "Admins" },
    { href: "/admin/contas", label: "Contas" },
    { href: "/admin/pagamentos", label: "Pagamentos" },
    { href: "/admin/links", label: "Links" },
    { href: "/admin/logs", label: "Logs" },
  ],
};

export function DesktopSidebar({ role }: { role: UserRole }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 border-r border-white/[0.08] bg-[#070909]/88 p-6 text-white shadow-2xl shadow-black/30 backdrop-blur-xl lg:flex lg:flex-col">
      <BrandMark />
      <nav className="mt-10 flex-1 space-y-2">
        {navItems[role].map((item) => (
          <Link
            className="flex min-h-11 items-center rounded-2xl border border-transparent px-4 text-sm font-bold text-zinc-400 transition-colors duration-200 hover:border-white/[0.08] hover:bg-white/[0.04] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00E07A]"
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <Link
        className="mt-6 flex min-h-11 items-center rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 text-sm font-bold text-rose-100 transition-colors duration-200 hover:bg-rose-400/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-200"
        href="/logout"
      >
        Sair
      </Link>
    </aside>
  );
}

export function MobileBottomNav({ role }: { role: UserRole }) {
  const items = navItems[role].slice(0, 4);

  return (
    <nav className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-5 rounded-[1.6rem] border border-white/[0.08] bg-[#070909]/92 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl lg:hidden">
      {[...items, { href: "/logout", label: "Sair" }].map((item) => (
        <Link
          className="flex min-h-12 items-center justify-center rounded-2xl px-2 text-center text-xs font-bold text-zinc-300 transition-colors duration-200 hover:bg-white/[0.06] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00E07A]"
          href={item.href}
          key={item.href}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
