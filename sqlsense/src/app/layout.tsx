import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: "SQLSense — Instant SQL Query Analysis",
  description:
    "Paste an SQL query and instantly get a plain-English explanation, optimization hints, index suggestions, and schema visualization. Free, open-source, no login required.",
  keywords: ["SQL", "query analysis", "optimization", "index suggestions", "SQL explain", "database"],
  authors: [{ name: "SQLSense" }],
  openGraph: {
    title: "SQLSense — Instant SQL Query Analysis",
    description: "Understand, optimize, and visualize SQL queries instantly.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
