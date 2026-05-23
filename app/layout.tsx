import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/app/components/Sidebar";
import ShortcutHandler from "@/app/components/ShortcutHandler";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Internal dashboard for managing ITR filings.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased h-screen flex overflow-hidden bg-white text-[#111]`}>
        <ShortcutHandler />
        <Sidebar />
        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}
