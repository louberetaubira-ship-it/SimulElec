import type { Metadata, Viewport } from 'next';
import Nav from '@/components/Nav';
import './globals.css';

const FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap';

export const metadata: Metadata = {
  title: { default: 'SimulElec', template: '%s · SimulElec' },
  description:
    "Simulateur d'armoires et de montages électrotechniques pour le Bac Pro MELEC et le BTS : câblage, mise en service, recherche de panne.",
  manifest: '/manifest.json',
  applicationName: 'SimulElec',
  appleWebApp: { capable: true, title: 'SimulElec', statusBarStyle: 'default' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/icon-192.png' },
};

export const viewport: Viewport = {
  themeColor: '#141A21',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" style={{ ['--font-title' as string]: '"Barlow Condensed", "Arial Narrow", sans-serif', ['--font-sans' as string]: '"IBM Plex Sans", system-ui, sans-serif', ['--font-mono' as string]: '"IBM Plex Mono", ui-monospace, monospace' }}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONTS_HREF} />
      </head>
      <body className="min-h-screen bg-[#F5F6F8] text-[#141A21] antialiased [font-family:var(--font-sans),system-ui,sans-serif]">
        <Nav />
        {children}
      </body>
    </html>
  );
}
