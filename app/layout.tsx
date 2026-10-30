import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import WelcomeModal from "@/components/WelcomeModal";
import Script from "next/script"; // 🚨 Imported Script

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nexa Capital",
  description: "Invest in high-yield industrial assets.",
  manifest: "/manifest.json", // 🚨 Linked Manifest here
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Nexa Capital",
  },
  // Once you generate your icons, uncomment and update these paths:
  // icons: {
  //   icon: "/icon-192x192.png",
  //   apple: "/icon-192x192.png",
  // },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#0a0a0f] text-zinc-100 min-h-screen`}>
        <div className="max-w-md mx-auto min-h-screen relative">
          {children}
          <BottomNav />
          <WelcomeModal />
        </div>
        
        {/* 🚨 Register Service Worker */}
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.register('/sw.js')
                .catch(function(err) {
                  console.log('Service Worker registration failed: ', err);
                });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
