import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./whatsapp.css";
import "./contacts.css";
export const metadata: Metadata = {
  title: "Alibi — Your fictional cast",
  description: "A fictional ensemble call. One scene. A cast of characters.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Alibi",
  },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0d1012",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
