import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'NIEE8 — Giản Đơn & Thanh Lịch',
    template: '%s — NIEE8',
  },
  description: 'Thương hiệu thời trang nữ phong cách Minimalist. Tinh tế, thanh lịch, tối giản. Khám phá bộ sưu tập mới nhất của NIEE8.',
  keywords: ['thời trang nữ', 'minimalist', 'niee8', 'váy', 'áo', 'quần', 'phong cách tối giản'],
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    url: 'https://niee8.vercel.app',
    siteName: 'NIEE8',
    title: 'NIEE8 — Giản Đơn & Thanh Lịch',
    description: 'Thương hiệu thời trang nữ phong cách Minimalist.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NIEE8 — Giản Đơn & Thanh Lịch',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
