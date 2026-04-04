import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
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
  title: "TORTEL'E",
  description: "TORTEL'E - Eng mazali va sifatli tortlar hamda shirinliklar",
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
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="afterInteractive"
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AuthProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
