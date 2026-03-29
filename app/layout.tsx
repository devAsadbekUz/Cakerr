import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
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
  title: "TORTEL'E",
  description: "TORTEL'E - Eng mazali va sifatli tortlar hamda shirinliklar",
  openGraph: {
    title: "TORTEL'E",
    description: "Eng zo'r tortlar faqat bizda. O'z didingizga mos tortni buyurtma qiling!",
    url: "https://torte-le.uz",
    siteName: "TORTEL'E",
    images: [
      {
        url: "https://torte-le.uz/app-preview.jpg",
        width: 1200,
        height: 630,
        alt: "TORTEL'E Ilovasi",
      },
    ],
    locale: "uz_UZ",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TORTEL'E",
    description: "Eng zo'r tortlar faqat bizda. O'z didingizga mos tortni buyurtma qiling!",
    images: ["https://torte-le.uz/app-preview.jpg"],
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
      <head />
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        <AuthProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
