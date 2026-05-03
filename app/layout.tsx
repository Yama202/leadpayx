import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";

import { SupabaseResourceHints } from "@/components/layout/supabase-resource-hints";
import { ThemeProvider } from "@/components/theme/theme-provider";
import "./globals.css";

/** Inline mínimo: tema antes da pintura — beforeInteractive não bloqueia parse como script cru no head mal posicionado. */
const themeInitScript =
  '(()=>{try{var s=localStorage.getItem("leadpayx-theme")||"system";var d=s==="dark"||(s==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(_){}})();';

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#050706" },
    { media: "(prefers-color-scheme: light)", color: "#050706" },
  ],
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL("https://leadpayx.com.br"),
  title: {
    default: "LeadPayX",
    template: "%s | LeadPayX",
  },
  description: "Controle leads. Distribua operações. Pague resultados.",
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "LeadPayX",
    description: "Controle leads. Distribua operações. Pague resultados.",
    url: "https://leadpayx.com.br",
    siteName: "LeadPayX",
    locale: "pt_BR",
    type: "website",
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "LeadPayX",
    description: "Controle leads. Distribua operações. Pague resultados.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <SupabaseResourceHints />
      </head>
      <body className="min-h-full bg-[#050706] text-white">
        <Script
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
          id="leadpayx-theme-init"
          strategy="beforeInteractive"
        />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
