import Providers from "@/app/providers";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { getSession } from "@/lib/auth";
import { validateServerEnv } from "@/lib/env";

const olyneroSans = Space_Grotesk({
  variable: "--font-olynero-sans",
  subsets: ["latin"],
});

const olyneroMono = JetBrains_Mono({
  variable: "--font-olynero-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OlyneroAI",
  description:
    "Премиальный app builder: опишите landing или CRUD и получите проект, сборку, превью и zip‑артефакт.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  validateServerEnv();
  const session = await getSession();

  return (
    <html lang="ru" className="dark">
      <body
        className={`${olyneroSans.variable} ${olyneroMono.variable} antialiased`}
      >
        <Providers session={session}>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
