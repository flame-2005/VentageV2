"use client";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { convex } from "@/convex/_client";
import Navbar from "@/components/Navbar/page";
import { useEffect, useState } from "react";
import { SearchProvider } from "@/context/searchContext";
import { ToastProvider } from "@/context/toastContext";
import { UserProvider } from "@/context/userContext";
import { useRouter } from "next/router";
import { usePathname } from "next/navigation";
import BugReporter from "@/components/BugReporter";

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


  const pathname = usePathname();

  // Scroll to top when component mounts or pathname changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);


  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >

        <ConvexProvider client={convex}>
          <UserProvider>
            <ToastProvider>
              <SearchProvider>
                <div className="lg:flex">

                  <Navbar />
                  <BugReporter/>
                  {children}
                </div>
              </SearchProvider>
            </ToastProvider>
          </UserProvider>
        </ConvexProvider>
      </body>
    </html>
  );
}
