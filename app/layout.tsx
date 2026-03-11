import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Cairo, Roboto } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cairo = Cairo({
  variable: "--font-cairo",
  weight: ["700"],
  subsets: ["arabic", "latin"],
});

const roboto = Roboto({
  variable: "--font-roboto",
  weight: ["400"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LFMS AAUP | نظام المفقودات",
  description: "نظام إدارة المفقودات والموجودات في الجامعة العربية الأمريكية",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${cairo.variable} ${roboto.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
