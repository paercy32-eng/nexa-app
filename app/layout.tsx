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
      {/* 👈 Dark chocolate background */}
      <body className={`${inter.className} bg-[#120804] text-zinc-100 antialiased min-h-screen`}>
        <div className="max-w-md mx-auto relative min-h-screen">
          {children}
        </div>
        
        <Toaster 
          position="top-center" 
          toastOptions={{
            style: { background: '#1a0b1c', color: '#fff', border: '1px solid rgba(168,85,247,0.3)' },
          }} 
        />
      </body>
    </html>
  );
}
