import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import { getAppPreviewUrl, getConfiguredAppUrl } from "./utils/appUrl";
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
  metadataBase: getConfiguredAppUrl() ? new URL(getConfiguredAppUrl()!) : undefined,
  title: {
    default: "TORTEL'E",
    template: "%s | TORTEL'E"
  },
  description: "TORTEL'E - Toshkentdagi eng mazali va sifatli tortlar hamda shirinliklar. O'z didingizga mos tortni buyurtma qiling!",
  keywords: ["tortlar", "shirinliklar", "zakazga tortlar", "cakes", "desserts", "Tashkent", "Uzbekistan"],
  openGraph: {
    title: "TORTEL'E",
    description: "Eng zo'r tortlar faqat bizda. O'z didingizga mos tortni buyurtma qiling!",
    url: getConfiguredAppUrl() || undefined,
    siteName: "TORTEL'E",
    images: getAppPreviewUrl() ? [
      {
        url: getAppPreviewUrl()!,
        width: 1200,
        height: 630,
        alt: "TORTEL'E Ilovasi",
      },
    ] : undefined,
    locale: "uz_UZ",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TORTEL'E",
    description: "Eng zo'r tortlar faqat bizda. O'z didingizga mos tortni buyurtma qiling!",
    images: getAppPreviewUrl() ? [getAppPreviewUrl()!] : undefined,
  },
  icons: {
    icon: [
      { url: '/logo.png' },
      { url: '/logo.png', sizes: '192x192', type: 'image/png' },
      { url: '/logo.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/logo.png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: "TORTEL'E",
  },
  manifest: '/manifest.json',
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: '#E298C1',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AuthProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
