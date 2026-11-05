import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { THEME_INIT_SCRIPT, ThemeProvider } from "@/lib/recallmap/theme";

// Self-hosted (see app/fonts/README.md): no build-time or runtime requests to Google Fonts.
const manrope = localFont({ src: "./fonts/manrope-latin-wght-normal.woff2", variable: "--font-manrope", weight: "200 800", display: "swap" });
const sourceSans = localFont({ src: "./fonts/source-sans-3-latin-wght-normal.woff2", variable: "--font-source-sans", weight: "200 900", display: "swap" });
const jetbrains = localFont({ src: "./fonts/jetbrains-mono-latin-wght-normal.woff2", variable: "--font-jetbrains", weight: "100 800", display: "swap" });

export const metadata: Metadata = {
  title: "RecallMap",
  description: "Understand more. Remember what matters.",
  applicationName: "RecallMap",
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f8fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1116" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${manrope.variable} ${sourceSans.variable} ${jetbrains.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
