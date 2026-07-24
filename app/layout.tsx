import type { Metadata } from 'next';
import './globals.css';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';

export const metadata: Metadata = {
  title: 'TripDeck — Southeast Asia',
  description: 'Offline-first travel command center for Malaysia, Singapore and Indonesia.',
  icons: { icon: '/tripdeck-logo.svg', shortcut: '/tripdeck-logo.svg', apple: '/tripdeck-logo.svg' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
