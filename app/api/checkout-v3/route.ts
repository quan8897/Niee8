import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ message: 'API is working' });
}

export async function POST(request: NextRequest) {
  try {
    // Đọc thử body để kiểm tra kết nối
    const body = await request.json();
    console.log('Received body:', body);
    
    return NextResponse.json({ 
      success: true, 
      message: 'API Minimal received your request',
      orderId: 'TEST-123'
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to parse JSON', details: err.message }, { status: 400 });
  }
}
