import type { Metadata } from "next";
import "./globals.css";
import { Plus_Jakarta_Sans } from 'next/font/google';

// Hanya unduh 3 bobot yang benar-benar dipakai di UI
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta',
  weight: ['400', '600', '700'],
});

export const metadata: Metadata = {
  title: "TaskFlow | JagoFarm",
  description: "Ruang kerja bersama tim JagoFarm",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${plusJakartaSans.className} font-sans`}>{children}</body>
    </html>
  );
}
