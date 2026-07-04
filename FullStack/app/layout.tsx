import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SliceMatic Stage 3",
  description: "Full-stack AI pizza ordering system for FDE PizzaFlow Stage 3"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
