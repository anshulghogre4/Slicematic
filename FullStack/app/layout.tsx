import type { Metadata, Viewport } from "next";
import { Inter, Unbounded, Hanken_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

// Landing display + body faces (expressive, non-generic) exposed as CSS vars.
const unbounded = Unbounded({
  subsets: ["latin"],
  display: "swap",
  weight: ["600", "700", "800"],
  variable: "--font-unbounded",
});

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-hanken",
});

export const metadata: Metadata = {
  title: "SliceMatic — Pizza ordering in Delhi NCR",
  description:
    "Order pizza from New Ashok Nagar. Customize toppings, see GST and bulk discounts clearly, and check out in minutes.",
  keywords: ["pizza", "ordering", "Delhi NCR", "New Ashok Nagar", "delivery", "SliceMatic"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#c5362c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${unbounded.variable} ${hankenGrotesk.variable}`}
      data-theme="slicematic"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var k='slicematic_theme';var t=localStorage.getItem(k);if(t==='dark')t='slicematic-dark';if(t==='light')t='slicematic';if(t!=='slicematic'&&t!=='slicematic-dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'slicematic-dark':'slicematic';}document.documentElement.setAttribute('data-theme',t);document.documentElement.dataset.theme=t;}catch(e){}})();`,
          }}
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
