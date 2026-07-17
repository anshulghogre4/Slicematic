import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "SliceMatic — AI-Powered Pizza Ordering",
  description:
    "Order artisan pizzas with AI-powered recommendations, real-time tracking, and a premium ordering experience.",
  keywords: ["pizza", "ordering", "AI recommendations", "delivery", "SliceMatic"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#c5362c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
