"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandLogo } from "@/components/ui/brand";
import type { UserRole } from "@/lib/types";

const navItems: Record<UserRole, { href: string; label: string }[]> = {
  captador: [
    { href: "/captador/dashboard", label: "Início" },
    { href: "/captador/avisos", label: "Avisos" },
    { href: "/captador/enviar-conta", label: "Enviar" },
    { href: "/captador/ofertas", label: "Ofertas" },
    { href: "/captador/indicacoes", label: "Indicações" },
    { href: "/captador/minhas-contas", label: "Contas" },
    { href: "/captador/pagamentos", label: "Pagamentos" },
  ],
  operator: [
    { href: "/operador/dashboard", label: "Fila" },
    { href: "/operador/historico", label: "Histórico" },
    { href: "/operador/pagamentos", label: "Pagamentos" },
  ],
  admin: [
    { href: "/admin/dashboard", label: "Visão geral" },
    { href: "/admin/captadores", label: "Captadores" },
    { href: "/admin/operadores", label: "Operadores" },
    { href: "/admin/administradores", label: "Admins" },
    { href: "/admin/contas", label: "Contas" },
    { href: "/admin/pagamentos/captadores", label: "Pag. Captadores" },
    { href: "/admin/pagamentos/operadores", label: "Pag. Operadores" },
    { href: "/admin/ofertas", label: "Ofertas" },
    { href: "/admin/comissoes", label: "Comissões" },
    { href: "/admin/configuracoes", label: "Configurações" },
    { href: "/admin/logs", label: "Logs" },
  ],
};

function activeNavHref(pathname: string, items: { href: string }[]): string | null {
  const sorted = [...items].sort((a, b) => b.href.length - a.href.length);
  for (const item of sorted) {
    if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
      return item.href;
    }
  }
  return null;
}

export function DesktopSidebar({ role }: { role: UserRole }) {
  const pathname = usePathname() ?? "";
  const items = navItems[role];
  const current = activeNavHref(pathname, items);

  return (
    <aside className="ml-4 mt-4 hidden min-h-0 w-72 shrink-0 rounded-[2rem] border border-white/[0.08] bg-[#070909]/90 p-5 text-white shadow-2xl shadow-black/35 backdrop-blur-xl lg:mb-4 lg:flex lg:flex-col lg:self-stretch">
      <BrandLogo showTagline variant="horizontal" />
      <nav className="mt-8 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-y-contain pr-1">
        {items.map((item) => {
          const active = item.href === current;
          return (
            <Link
              className={`group flex min-h-11 items-center rounded-2xl border px-4 text-sm font-bold transition-all duration-200 hover:translate-x-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00E07A] ${
                active
                  ? "border-white/[0.12] bg-white/[0.06] text-white"
                  : "border-transparent text-zinc-400 hover:border-white/[0.08] hover:bg-white/[0.05] hover:text-white"
              }`}
              href={item.href}
              prefetch={false}
              key={item.href}
              aria-current={active ? "page" : undefined}
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full transition-colors duration-200 ${
                  active ? "bg-[#00E07A]" : "bg-[#00E07A]/0 group-hover:bg-[#00E07A]/60"
                }`}
              />
              <span className="ml-3">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <Link
        className="mt-5 flex min-h-11 shrink-0 items-center justify-center rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 text-sm font-bold text-rose-100 transition-colors duration-200 hover:bg-rose-400/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-200"
        href="/logout"
        prefetch={false}
      >
        Sair
      </Link>
    </aside>
  );
}

export function MobileBottomNav({ role }: { role: UserRole }) {
  const pathname = usePathname() ?? "";
  const items = navItems[role];
  const current = activeNavHref(pathname, items);
  const allItems = [...items, { href: "/logout", label: "Sair" }];

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 lg:hidden">
      <nav className="relative overflow-hidden rounded-[1.6rem] border border-white/[0.08] bg-[#070909]/92 shadow-2xl shadow-black/40 backdrop-blur-xl">
        {/* fade hint on right edge */}
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 rounded-r-[1.6rem] bg-gradient-to-l from-[#070909]/80 to-transparent" />
        <div className="flex overflow-x-auto p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {allItems.map((item) => {
            const active = item.href !== "/logout" && item.href === current;
            return (
              <Link
                className={`flex min-h-12 shrink-0 items-center justify-center rounded-2xl px-3.5 text-center text-xs font-bold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00E07A] ${
                  active
                    ? "bg-white/[0.08] text-white"
                    : "text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                }`}
                href={item.href}
                prefetch={false}
                key={item.href}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
