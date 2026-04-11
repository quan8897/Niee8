import React from 'react';

export default function ZaloIcon({ size = 24, className = "", ...props }: { size?: number, className?: string, [key: string]: any }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      // text-gray-500 là màu mặc định (tối giản), hover:text-[#0068FF] là màu Zalo
      className={`text-gray-500 transition-all duration-300 hover:-translate-y-1 hover:text-[#0068FF] cursor-pointer ${className}`}
      {...props}
    >
      <path fill="currentColor" d="M21.22 12.06c0-5.11-4.74-9.25-10.6-9.25S.02 6.95.02 12.06c0 4.14 3.06 7.66 7.37 8.8.44.11.75.52.75.98v1.89c0 .63.66 1.02 1.21.68l3.16-1.93c.27-.16.59-.22.9-.17 4.15.68 7.81-1.85 7.81-6.25z" />
      <path fill="#fff" d="M15.42 14.95H9.68v-1.39h2.24L9.68 10.48V9.09h5.74v1.39h-2.24l2.24 3.08v1.39z" />
    </svg>
  );
}
