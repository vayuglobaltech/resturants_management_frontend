import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "Restaurant Management",
  description: "Restaurant Management System",
  manifest: "/manifest.json",

  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Restaurant Management",
  },

  icons: {
    icon: "/favicon.ico",
    apple: "/icons/icon-192x192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body data-new-gr-c-s-check-loaded="14.1305.0"
        data-gr-ext-installed=""
        cz-shortcut-listen="true">
        <AuthProvider>
          <ServiceWorkerRegistration />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}