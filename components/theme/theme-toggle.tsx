"use client";

import { useTheme } from "@/components/theme/theme-provider";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      aria-label="Alternar entre tema claro e escuro"
      className="inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-2 text-zinc-200 shadow-lg shadow-black/10 transition-colors duration-200 hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      type="button"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.04]">
        <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
          <path
            d="M12 4V2m0 20v-2m8-8h2M2 12h2m13.66-5.66 1.41-1.41M4.93 19.07l1.41-1.41m11.32 0 1.41 1.41M4.93 4.93l1.41 1.41M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      </span>
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#00E07A]/10 text-[#16F28A]">
        <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
          <path
            d="M20.25 15.7A8.5 8.5 0 0 1 8.3 3.75 8.5 8.5 0 1 0 20.25 15.7Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      </span>
    </button>
  );
}
