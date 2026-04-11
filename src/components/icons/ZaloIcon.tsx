import React from 'react';

export default function ZaloIcon({ size = 24, className = "", ...props }: { size?: number, className?: string, [key: string]: any }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`transition-all duration-300 ${className}`}
      {...props}
    >
      <path fill="currentColor" d="M21.22 12.06c0-5.11-4.74-9.25-10.6-9.25S.02 6.95.02 12.06c0 4.14 3.06 7.66 7.37 8.8.44.11.75.52.75.98v1.89c0 .63.66 1.02 1.21.68l3.16-1.93c.27-.16.59-.22.9-.17 4.15.68 7.81-1.85 7.81-6.25z" />
      <path fill="#fff" d="M15.42 14.95h-2.31c-.34 0-.62-.28-.62-.62v-3.79h-1.6v3.79c0 .34-.28.62-.62.62H8.56c-.34 0-.62-.28-.62-.62V9.3c0-.34.28-.62.62-.62h1.72c.34 0 .62.28.62.62v3.79h1.6V9.3c0-.34.28-.62.62-.62h2.31c.34 0 .62.28.62.62v5.03c0 .34-.28.62-.62.62z" />
    </svg>
  );
}
