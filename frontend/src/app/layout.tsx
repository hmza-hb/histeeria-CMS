import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SplashScreen from "@/components/SplashScreen";
import AppShell from "@/components/AppShell";
import PWARegister from "@/components/PWARegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://histeeria-memory.vercel.app";

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Histeeria Memory — AI Personal Cognitive Memory",
    template: "%s | Histeeria Memory",
  },
  description: "You live your life; Histeeria remembers it. AI-powered cognitive memory infrastructure for seamless personal recall, knowledge extraction, and intelligent reminders.",
  keywords: [
    "Histeeria Memory",
    "personal memory AI",
    "cognitive memory",
    "second brain",
    "semantic retrieval",
    "pgvector",
    "AI reminders",
    "knowledge management",
  ],
  authors: [{ name: "Histeeria Memory" }],
  creator: "Histeeria Memory",
  manifest: "/manifest.json",
  icons: {
    icon: "/histeeria-logo.png",
    shortcut: "/histeeria-logo.png",
    apple: "/histeeria-logo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Histeeria Memory",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: baseUrl,
    siteName: "Histeeria Memory",
    title: "Histeeria Memory — AI Personal Cognitive Memory",
    description: "You live your life; Histeeria remembers it. Capture information, extract facts, and search your personal history effortlessly.",
    images: [
      {
        url: "/histeeria-logo.png",
        width: 512,
        height: 512,
        alt: "Histeeria Memory Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Histeeria Memory — AI Personal Cognitive Memory",
    description: "You live your life; Histeeria remembers it.",
    images: ["/histeeria-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Histeeria Memory",
    "url": baseUrl,
    "description": "You live your life; Histeeria remembers it. AI-powered personal cognitive memory application.",
    "applicationCategory": "ProductivityApplication",
    "operatingSystem": "All",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
    },
    "featureList": [
      "Natural language memory capture",
      "AI knowledge extraction & entity linking",
      "Vector semantic similarity retrieval",
      "Context-grounded question answering",
      "Intelligent proactive reminders",
    ],
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 text-slate-900 min-h-screen`}
      >
        <SplashScreen />
        <PWARegister />
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
