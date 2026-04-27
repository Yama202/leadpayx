import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";
import Link from "next/link";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

const variants = {
  primary:
    "bg-[#00E07A] text-[#031008] shadow-[0_0_34px_rgba(0,224,122,0.24)] hover:bg-[#16F28A] focus-visible:outline-[#16F28A]",
  secondary:
    "border border-white/[0.08] bg-white/[0.04] text-white hover:bg-white/[0.08] focus-visible:outline-white",
  ghost: "text-zinc-300 hover:bg-white/[0.06] hover:text-white focus-visible:outline-white",
  danger:
    "bg-rose-500 text-white shadow-lg shadow-rose-950/20 hover:bg-rose-400 focus-visible:outline-rose-300",
};

export function Button({ className = "", variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-11 cursor-pointer items-center justify-center rounded-2xl px-5 py-3 text-sm font-bold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

type LinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
  variant?: keyof typeof variants;
};

export function LinkButton({
  className = "",
  href,
  variant = "primary",
  children,
  ...props
}: LinkButtonProps) {
  return (
    <Link
      className={`inline-flex min-h-11 cursor-pointer items-center justify-center rounded-2xl px-5 py-3 text-sm font-bold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${variants[variant]} ${className}`}
      href={href}
      {...props}
    >
      {children}
    </Link>
  );
}
