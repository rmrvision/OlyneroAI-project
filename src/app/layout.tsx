import Providers from "@/app/providers";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getSession } from "@/lib/auth";
import { validateServerEnv } from "@/lib/env";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OlyneroAI",
  description:
    "Lovable-like app builder: describe a landing or CRUD app and get a generated project, build, preview, and zip artifact.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  validateServerEnv();
  const session = await getSession();

  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers session={session}>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
