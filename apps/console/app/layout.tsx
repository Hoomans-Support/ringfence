import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s · Ringfence",
    default: "Ringfence",
  },
  description: "Ringfence detects networks of fraudulent accounts before PayPal processes their payouts.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <link rel="stylesheet" href="/api/vendor/bryntum/theme" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
