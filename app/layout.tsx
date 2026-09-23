import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SENTINEL-SOC | Real-Time Database Security & AI Threat Intelligence',
  description: 'Enterprise Real-Time Database Monitoring, HMAC-SHA256 Cryptographic Webhooks, and Asynchronous Dual AI Threat Analysis.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark">
      <body className="antialiased selection:bg-cyan-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
