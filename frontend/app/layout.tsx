import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sweet Studio - Photobooth Kiosk",
  description:
    "Sweet Studio: a little moment, a lovely memory. Touchscreen iPad Kiosk Interface for Automated Photobooth.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Sweet Studio",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FFF9F2",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-dvh sweet-bg text-sweet-text font-sans antialiased flex flex-col">
        {children}
      </body>
    </html>
  );
}
