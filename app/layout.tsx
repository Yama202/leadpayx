import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    shortcut: "/icon.png",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "LeadPayX",
    description: "Controle leads. Distribua operações. Pague resultados.",
    url: "https://leadpayx.com.br",
    siteName: "LeadPayX",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "LeadPayX",
      },
    ],
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
        <script>{`
          (() => {
            try {
              const stored = localStorage.getItem("leadpayx-theme") || "system";
              const dark = stored === "dark" || (stored === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
              document.documentElement.classList.toggle("dark", dark);
            } catch (_) {}
          })();
        `}</script>
      </head>
      <body className="min-h-full bg-[#050706] text-white">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
