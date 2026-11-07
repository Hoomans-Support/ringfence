import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { TopBar } from "./top-bar";
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
    // suppressHydrationWarning: the script below may set data-theme before React hydrates.
    <html lang="en" className={`${geist.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Applies a saved dark-mode choice before the first paint, so the page never flashes light. */}
        <script dangerouslySetInnerHTML={{ __html: "try{if(localStorage.getItem('rf-theme')==='dark')document.documentElement.dataset.theme='dark'}catch(e){}" }} />
        <link rel="stylesheet" href="/api/vendor/bryntum/theme" />
      </head>
      <body className="min-h-full flex flex-col">
        <Suspense fallback={<div className="h-[73px] border-b border-rf-hairline" />}>
          <TopBar />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
