import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SPHEREx Sky Diary - NASA Space Apps Challenge 2026",
  description:
    "Explore multi-epoch SPHEREx sky time-lapses, automated asteroid and comet detection, Planet X candidate discovery, and 102-channel spectrophotometry.",
  keywords: [
    "SPHEREx",
    "NASA Space Apps Challenge 2026",
    "Asteroids",
    "Planet X",
    "Spectrophotometry",
    "Astronomy",
    "Sky Diary",
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#050814",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-space-950 text-space-100 font-sans antialiased min-h-screen overflow-x-hidden selection:bg-cyan-500 selection:text-space-950">
        {children}
      </body>
    </html>
  );
}
