import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'NIE8 — Giản Đơn & Thanh Lịch',
    template: '%s — NIE8',
  },
  description: 'Thương hiệu thời trang nữ phong cách Minimalist. Tinh tế, thanh lịch, tối giản. Khám phá bộ sưu tập mới nhất của NIE8.',
  keywords: ['thời trang nữ', 'minimalist', 'nie8', 'váy', 'áo', 'quần', 'phong cách tối giản'],
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    url: 'https://nie8studio.vn',
    siteName: 'NIE8',
    title: 'NIE8 — Giản Đơn & Thanh Lịch',
    description: 'Thương hiệu thời trang nữ phong cách Minimalist.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NIE8 — Giản Đơn & Thanh Lịch',
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
