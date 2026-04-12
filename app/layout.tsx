import type { Metadata } from 'next';
import { Montserrat, Cormorant_Garamond } from 'next/font/google';
import './globals.css';

const montserrat = Montserrat({
  subsets: ['vietnamese', 'latin'],
  weight: ['300', '400', '500'],
  variable: '--font-sans',
  display: 'swap',
});

const cormorantGaramond = Cormorant_Garamond({
  subsets: ['vietnamese', 'latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://nie8studio.vn'),
  title: {
    default: 'NIE8 — Giản Đơn & Thanh Lịch | Minimalist Fashion Studio',
    template: '%s — NIE8',
  },
  description: 'Thương hiệu thời trang nữ phong cách Minimalist. Tinh tế, thanh lịch, tối giản. Khám phá bộ sưu tập đầm và phụ kiện thiết kế độc quyền của NIE8 Studio.',
  keywords: ['thời trang nữ', 'minimalist', 'nie8 studio', 'váy thiết kế', 'áo lụa', 'quần tây thanh lịch', 'phong cách tối giản', 'nie8 vietnam'],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    url: 'https://nie8studio.vn',
    siteName: 'NIE8 Studio',
    title: 'NIE8 — Giản Đơn & Thanh Lịch | Thời Trang Tối Giản',
    description: 'Tinh tế trong từng đường nét. Khám phá phong cách Minimalist Romantic cùng NIE8.',
    images: [{
      url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop',
      width: 1200,
      height: 630,
      alt: 'NIE8 Studio — Minimalist Fashion Collection'
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NIE8 — Giản Đơn & Thanh Lịch',
    description: 'Thương hiệu thời trang nữ phong cách Minimalist.',
    images: ['https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop'],
  },
  robots: { 
    index: true, 
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  themeColor: '#ffffff',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`${montserrat.variable} ${cormorantGaramond.variable}`}>
      <head>
        <link rel="preconnect" href="https://vjbjovqyngmudgimdbbt.supabase.co" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
