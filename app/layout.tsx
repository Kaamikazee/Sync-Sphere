import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import {
  Dancing_Script,
  Caveat,
  Shadows_Into_Light,
  Great_Vibes,
  Satisfy,
  Architects_Daughter,
  Amatic_SC,
  Just_Me_Again_Down_Here as Just_Another_Hand,
} from 'next/font/google';
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/providers/AuthProvider";

import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { ourFileRouter } from "./api/uploadthing/core";
import { QueryProvider } from "@/providers/QueryClientProvider";
import {
  orbitron,
  playfair,
  indie,
  firaCode,
  raleway,
  pressStart,
  pacifico,
  bebas,
  rubikMono,
  cinzel,
} from "@/lib/font";
import RippleProvider from "@/components/common/RippleProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const dancing = Dancing_Script({
  variable: '--font-dancing',
  subsets: ['latin'],
  weight: ['700'],
  display: 'swap',
});

export const caveat = Caveat({
  variable: '--font-caveat',
  subsets: ['latin'],
  weight: ['700'],
  display: 'swap',
});

export const shadows = Shadows_Into_Light({
  variable: '--font-shadows',
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
});

export const vibes = Great_Vibes({
  variable: '--font-vibes',
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
});

export const satisfy = Satisfy({
  variable: '--font-satisfy',
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
});

export const architect = Architects_Daughter({
  variable: '--font-architect',
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
});

export const amatic = Amatic_SC({
  variable: '--font-amatic',
  subsets: ['latin'],
  weight: ['700'],
  display: 'swap',
});

export const just = Just_Another_Hand({
  variable: '--font-just',
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Sync Sphere",
  description: "Track time & do more with your group in real time!",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export const viewport = {
  themeColor: "#2563eb", // ✅ move it here
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${orbitron.variable} ${playfair.variable} ${indie.variable} ${firaCode.variable} ${raleway.variable} ${pressStart.variable} ${pacifico.variable} ${bebas.variable} ${rubikMono.variable} ${cinzel.variable} ${just.variable} ${amatic.variable} ${dancing.variable} ${caveat.variable} ${shadows.variable} ${vibes.variable} ${satisfy.variable} ${architect.variable} antialiased`}
      >
        <AuthProvider>
          <QueryProvider>
            <Toaster richColors />
            <NextSSRPlugin routerConfig={extractRouterConfig(ourFileRouter)} />
            <RippleProvider />
            {children}
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
