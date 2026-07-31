import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: {
    default: "ByteArena — systems engineering challenges",
    template: "%s — ByteArena",
  },
  description:
    "Write and execute real code for low-level systems problems. Implement flash translation layers, write-ahead logs and garbage collectors, then watch them graded on write amplification and resilience to injected hardware faults.",
  applicationName: "ByteArena",
  keywords: [
    "systems engineering",
    "SSD",
    "flash translation layer",
    "write amplification",
    "coding challenges",
    "database internals",
  ],
  openGraph: {
    title: "ByteArena — systems engineering challenges",
    description:
      "Implement storage and hardware internals, graded on the metrics engineers actually argue about.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#08090a",
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col bg-canvas text-ink">
        {children}
      </body>
    </html>
  );
}
