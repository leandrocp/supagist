import type { Metadata } from "next";
import { Geist, Source_Code_Pro } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Providers } from "./providers";
import { NotificationsListener } from "@/components/notifications-listener";
import { Toaster } from "@/components/ui/sonner";
import { getMetadataBase, hasEnvVars } from "@/lib/utils";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: "Supagist",
  description: "A super gist built with Supabase and Lumis.",
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
      </body>
    </html>
  );
}
