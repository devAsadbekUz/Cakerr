import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SupabaseProvider from "./context/SupabaseContext";
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
  title: "Tort Magazin",
  description: "Eng zo'r tortlar faqat bizda",
  openGraph: {
    title: "Tort Magazin - Mazali tortlar yetkazib berish",
    description: "Eng zo'r tortlar faqat bizda. O'z didingizga mos tortni buyurtma qiling!",
    url: "https://cakerr.vercel.app", // Use production URL
    siteName: "Tort Magazin",
    images: [
      {
        url: "https://cakerr.vercel.app/app-preview.jpg",
        width: 1200,
        height: 630,
        alt: "Tort Magazin Ilovasi",
      },
    ],
    locale: "uz_UZ",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tort Magazin - Mazali tortlar yetkazib berish",
    description: "Eng zo'r tortlar faqat bizda. O'z didingizga mos tortni buyurtma qiling!",
    images: ["https://cakerr.vercel.app/app-preview.jpg"],
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
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        />
        <script src="https://telegram.org/js/telegram-web-app.js"></script>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <SupabaseProvider>
          {children}
        </SupabaseProvider>
      </body>
    </html>
  );
}
