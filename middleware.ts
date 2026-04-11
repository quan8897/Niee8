import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Lớp bảo vệ cơ bản: Chặn các request quá nhanh hoặc từ Bot vào AI/Checkout
  if (path.startsWith('/api/ai') || path.startsWith('/api/checkout')) {
    const userAgent = request.headers.get('user-agent') || '';
    
    // Chặn các User-Agent Bot/Spider phổ biến
    if (userAgent.toLocaleLowerCase().includes('bot') || 
        userAgent.toLocaleLowerCase().includes('spider') || 
        userAgent.toLocaleLowerCase().includes('python') || 
        userAgent.toLocaleLowerCase().includes('curl')) {
      return new NextResponse(
        JSON.stringify({ error: 'Automated requests are not allowed.' }), 
        { status: 403, headers: { 'content-type': 'application/json' } }
      );
    }
  }

  return NextResponse.next();
}

// Chỉ áp dụng middleware cho các đường dẫn nhạy cảm để tối ưu hiệu năng
export const config = {
  matcher: ['/api/ai/:path*', '/api/checkout/:path*'],
};
