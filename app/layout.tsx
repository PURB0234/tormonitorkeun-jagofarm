
import type { Metadata } from "next";
import "./globals.css";
import { Plus_Jakarta_Sans } from 'next/font/google';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta', // Membuat class CSS variable
  weight: ['300', '400', '500', '600', '700', '800'], // Pilih ketebalan yang dibutuhkan
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
    <html lang="id" >
      <body className={`${plusJakartaSans.className} font-sans`}>{children}</body>
    </html>
  );
}
