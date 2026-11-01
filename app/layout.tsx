import type { Metadata, Viewport } from "next";
import { Geist, Source_Code_Pro } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Analytics } from "@vercel/analytics/next";
import { Providers } from "./providers";
import { NotificationsListener } from "@/components/notifications-listener";
import { Toaster } from "@/components/ui/sonner";
import { getMetadataBase, hasEnvVars } from "@/lib/utils";
import "./globals.css";

const DEFAULT_SHARE_IMAGE = {
  url: "/og-image.png",
  width: 1200,
  height: 630,
  alt: "Supagist: a code card in front of an envelope sealed with red wax. Code worth sending.",
};

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: "Supagist",
  description: "A super gist built with Supabase and Lumis.",
  // The brand favicon set (assets/brand/favicon/head-snippet.html). The ICO
  // carries 16, 32 and 48; the SVG is the flat seal and follows the OS theme.
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  // Declared here rather than as app/opengraph-image.png because Turbopack
  // ignores the opengraph-image.alt.txt convention. Snippet pages override
  // these with their own generated image.
  openGraph: { images: [DEFAULT_SHARE_IMAGE] },
  twitter: { card: "summary_large_image", images: [DEFAULT_SHARE_IMAGE] },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4EDE0" },
    { media: "(prefers-color-scheme: dark)", color: "#121212" },
  ],
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

const sourceCodePro = Source_Code_Pro({
  variable: "--font-source-code-pro",
  display: "swap",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} ${sourceCodePro.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <Providers enableSupabaseSession={hasEnvVars}>{children}</Providers>
          {hasEnvVars ? <NotificationsListener /> : null}
          <Toaster richColors closeButton position="bottom-right" />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
