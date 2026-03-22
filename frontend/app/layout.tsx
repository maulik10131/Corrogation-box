import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import LayoutShell from '@/components/LayoutShell';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Corrugation PMS',
  description: 'Production Management System for Corrugation Box Manufacturing',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}