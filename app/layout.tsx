import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cadbury | Premium Assets",
  description: "The Sweet Taste of Success.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#0a0a0f] text-zinc-100 antialiased min-h-screen`}>
        <div className="max-w-md mx-auto relative min-h-screen">
          {children}
        </div>
        <Toaster 
          position="top-center" 
          toastOptions={{
            style: { background: '#12121a', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' },
          }} 
        />
      </body>
    </html>
  );
}
