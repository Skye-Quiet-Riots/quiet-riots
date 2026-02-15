import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NavBar } from "@/components/layout/nav-bar";
import { Footer } from "@/components/layout/footer";
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
  title: "Quiet Riots — Change. Finally.",
  description:
    "Organise around shared issues. Find your people. Take action together.",
  openGraph: {
    title: "Quiet Riots — Change. Finally.",
    description:
      "Organise around shared issues. Find your people. Take action together.",
    url: "https://www.quietriots.com",
    siteName: "Quiet Riots",
    images: [
      {
        url: "https://www.quietriots.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Quiet Riots — Change. Finally.",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Quiet Riots — Change. Finally.",
    description:
      "Organise around shared issues. Find your people. Take action together.",
    images: ["https://www.quietriots.com/og-image.jpg"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/logo-192.png",
  },
};

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
        <NavBar />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
