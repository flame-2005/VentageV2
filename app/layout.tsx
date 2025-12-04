"use client";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { convex } from "@/convex/_client";
import Navbar from "@/components/Navbar/page";
import { useState } from "react";
import { SearchProvider } from "@/context/searchContext";
import { ToastProvider } from "@/context/toastContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >

        <ConvexProvider client={convex}>
          <ToastProvider>

            <SearchProvider>
              <Navbar />
              {children}
            </SearchProvider>
          </ToastProvider>
        </ConvexProvider>
      </body>
    </html>
  );
}
