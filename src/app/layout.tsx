import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import {
  PRODUCT_DESCRIPTION,
  PRODUCT_NAME,
  PRODUCT_TAGLINE,
} from "@/lib/brand";
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
    default: `${PRODUCT_NAME}: ${PRODUCT_TAGLINE}`,
    template: `%s | ${PRODUCT_NAME}`,
  },
  description: PRODUCT_DESCRIPTION,
  applicationName: PRODUCT_NAME,
  keywords: [
    "systems engineering",
    "SSD",
    "flash translation layer",
    "write amplification",
    "coding challenges",
    "database internals",
  ],
  openGraph: {
    title: `${PRODUCT_NAME}: ${PRODUCT_TAGLINE}`,
    description: PRODUCT_DESCRIPTION,
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
      {/*
        Only the document shell lives here. Chrome is decided one level down,
        because the site and the arena want opposite things from a page: the
        site is a document that scrolls under a nav and ends in a footer, while
        the arena is a workspace that owns the whole viewport and brings its
        own toolbar. Putting a shared nav and footer here forced the arena to
        live inside furniture it did not want, and the footer ended up
        overlapping the problem description.
      */}
      <body className="min-h-full bg-canvas text-body">{children}</body>
    </html>
  );
}
