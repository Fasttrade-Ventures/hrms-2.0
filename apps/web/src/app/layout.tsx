import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { InstallPrompt } from "@/components/pwa/install-prompt";

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
  title: "BukuHR",
  description: "BukuHR people operations",
  // The manifest itself is emitted by app/manifest.ts at /manifest.webmanifest.
  appleWebApp: { capable: true, title: "BukuHR", statusBarStyle: "default" },
  icons: { apple: "/icons/icon-192.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <script
          id="runtime-env"
          dangerouslySetInnerHTML={{
            __html: `window.__ENV = ${JSON.stringify({
              NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
              NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
              NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || "",
            })};`,
          }}
        />
        {children}
        <InstallPrompt />
      </body>
    </html>
  );
}
