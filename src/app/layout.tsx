import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "HumpAlert — Speed Hump Tracker",
  description: "Record speed hump locations and get real-time alerts before you reach them. Never get surprised by a speed hump again.",
  keywords: "speed hump, road hazard, GPS tracker, driving alert",
  openGraph: {
    title: "HumpAlert — Speed Hump Tracker",
    description: "Real-time speed hump alerts for safer driving",
    type: "website",
  },
};
//tes
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="h-full antialiased font-sans">{children}</body>
    </html>
  );
}
